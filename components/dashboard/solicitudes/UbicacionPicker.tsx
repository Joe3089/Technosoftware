"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { API_KEY, loadGoogleMaps } from "@/components/common/GoogleMapInner";

export interface Ubicacion {
  direccion: string;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  ubicacion_fuente: "google" | "openstreetmap" | "manual" | null;
}

const DEFAULT = { lat: 10.48, lng: -66.87 }; // Caracas

/** Map adapter so the UI is the same for Google Maps and Leaflet/OpenStreetMap. */
interface MapApi {
  setMarker: (lat: number, lng: number, pan?: boolean) => void;
  clear: () => void;
  reverse: (lat: number, lng: number) => Promise<{ address: string; placeId: string | null } | null>;
}

async function nominatim(path: string) {
  const r = await fetch(`https://nominatim.openstreetmap.org/${path}&format=json`, { headers: { "Accept-Language": "es" } });
  if (!r.ok) throw new Error();
  return r.json();
}

export default function UbicacionPicker({ value, onChange, error }: {
  value: Ubicacion; onChange: (u: Ubicacion) => void; error?: string;
}) {
  const fuente = API_KEY ? "google" : "openstreetmap";
  const mapEl = useRef<HTMLDivElement>(null);
  const searchEl = useRef<HTMLDivElement>(null);
  const api = useRef<MapApi | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [geo, setGeo] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<{ display_name: string; lat: string; lon: string; place_id: number }[] | null>(null);

  /** A point the user explicitly chose on the map / via search / via geolocation. */
  async function elegir(lat: number, lng: number, address?: string, placeId?: string | null) {
    api.current?.setMarker(lat, lng, true);
    let dir = address, pid = placeId ?? null;
    if (!dir) {
      setBusy(true);
      const r = await api.current?.reverse(lat, lng).catch(() => null);
      setBusy(false);
      dir = r?.address; pid = r?.placeId ?? null;
    }
    // Keep what the user typed if the service can't resolve an address
    onChange({ direccion: dir || valueRef.current.direccion, lat, lng, place_id: pid, ubicacion_fuente: fuente });
  }

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    (async () => {
      try {
        if (API_KEY) {
          await loadGoogleMaps();
          const g = window.google.maps;
          const { Map } = await g.importLibrary("maps");
          const places = await g.importLibrary("places");
          if (cancelled || !mapEl.current) return;
          const map = new Map(mapEl.current, { center: DEFAULT, zoom: 12, streetViewControl: false, mapTypeControl: false });
          let marker: any = null;
          const geocoder = new g.Geocoder();
          api.current = {
            setMarker(lat, lng, pan) {
              if (!marker) {
                marker = new g.Marker({ map, draggable: true });
                marker.addListener("dragend", (e: any) => elegir(e.latLng.lat(), e.latLng.lng()));
              }
              marker.setPosition({ lat, lng });
              if (pan) { map.panTo({ lat, lng }); map.setZoom(16); }
            },
            clear() { marker?.setMap(null); marker = null; },
            reverse: (lat, lng) => new Promise((res) => geocoder.geocode({ location: { lat, lng } }, (r: any[] | null, s: string) =>
              res(s === "OK" && r?.[0] ? { address: r[0].formatted_address, placeId: r[0].place_id } : null))),
          };
          map.addListener("click", (e: any) => elegir(e.latLng.lat(), e.latLng.lng()));

          // Places autocomplete (new PlaceAutocompleteElement)
          const ac = new places.PlaceAutocompleteElement({});
          ac.style.width = "100%";
          ac.addEventListener("gmp-select", async ({ placePrediction }: any) => {
            const place = placePrediction.toPlace();
            await place.fetchFields({ fields: ["formattedAddress", "location", "id"] });
            if (place.location) elegir(place.location.lat(), place.location.lng(), place.formattedAddress, place.id);
          });
          searchEl.current?.appendChild(ac);
          cleanup = () => ac.remove();
        } else {
          const L = await import("leaflet");
          if (cancelled || !mapEl.current) return;
          const map = L.map(mapEl.current).setView([DEFAULT.lat, DEFAULT.lng], 12);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
          }).addTo(map);
          let marker: import("leaflet").CircleMarker | null = null;
          api.current = {
            setMarker(lat, lng, pan) {
              if (!marker) marker = L.circleMarker([lat, lng], { radius: 9, color: "#00cfff", fillColor: "#4d7fff", fillOpacity: 0.9 }).addTo(map);
              marker.setLatLng([lat, lng]);
              if (pan) map.setView([lat, lng], 16);
            },
            clear() { marker?.remove(); marker = null; },
            async reverse(lat, lng) {
              const d = await nominatim(`reverse?lat=${lat}&lon=${lng}`);
              return d?.display_name ? { address: d.display_name, placeId: d.place_id ? `osm:${d.place_id}` : null } : null;
            },
          };
          map.on("click", (e) => elegir(e.latlng.lat, e.latlng.lng));
          setTimeout(() => map.invalidateSize(), 100);
          cleanup = () => map.remove();
        }
        if (valueRef.current.lat !== null) api.current!.setMarker(valueRef.current.lat, valueRef.current.lng!, true);
        setEstado("listo");
      } catch {
        if (!cancelled) setEstado("error");
      }
    })();
    return () => { cancelled = true; cleanup(); api.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscarOsm() {
    if (q.trim().length < 3) return;
    setBusy(true);
    try { setResultados(await nominatim(`search?q=${encodeURIComponent(q)}&limit=5`)); }
    catch { setResultados([]); }
    finally { setBusy(false); }
  }

  function miUbicacion() {
    setGeo("");
    if (!navigator.geolocation) { setGeo("Tu navegador no permite obtener la ubicación."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); elegir(p.coords.latitude, p.coords.longitude); },
      () => { setBusy(false); setGeo("No se obtuvo tu ubicación (permiso denegado o no disponible). Puedes buscarla o escribirla."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function quitarPunto() {
    api.current?.clear();
    onChange({ ...value, lat: null, lng: null, place_id: null, ubicacion_fuente: value.direccion ? "manual" : null });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      {estado !== "error" && (API_KEY ? (
        <div ref={searchEl} className="min-h-[40px]" aria-label="Buscar dirección" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar dirección (ej. Av. Francisco de Miranda, Caracas)"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarOsm(); } }} aria-label="Buscar dirección" />
            <button type="button" onClick={buscarOsm} className="px-3 rounded-lg border border-glass-bd text-silver hover:text-white" aria-label="Buscar">
              <Search className="w-4 h-4" />
            </button>
          </div>
          {resultados && (
            <ul className="rounded-lg border border-glass-bd divide-y divide-glass-bd/60 text-xs">
              {resultados.length === 0 && <li className="px-3 py-2 text-silver/70">Sin coincidencias. Marca el punto en el mapa o escribe la dirección.</li>}
              {resultados.map((r) => (
                <li key={r.place_id}>
                  <button type="button" className="w-full text-left px-3 py-2 text-silver hover:text-white hover:bg-white/5"
                    onClick={() => { setResultados(null); elegir(Number(r.lat), Number(r.lon), r.display_name, `osm:${r.place_id}`); }}>
                    {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* Map */}
      <div className="relative">
        <div ref={mapEl} className="w-full rounded-xl overflow-hidden border border-glass-bd bg-navy-mid/40" style={{ height: 260, zIndex: 0 }} />
        {estado === "cargando" && <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-blue-accent animate-spin" />}
        {estado === "error" && (
          <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-silver/70">
            El mapa no está disponible. Escribe la dirección manualmente abajo.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {estado === "listo" && (
          <button type="button" onClick={miUbicacion} className="flex items-center gap-1.5 text-blue-accent hover:underline">
            <Crosshair className="w-3.5 h-3.5" /> Usar mi ubicación actual
          </button>
        )}
        {busy && <Loader2 className="w-3.5 h-3.5 text-blue-accent animate-spin" />}
        {value.lat !== null ? (
          <span className="flex items-center gap-1.5 text-status-green">
            <MapPin className="w-3.5 h-3.5" /> Punto marcado en el mapa ({value.lat.toFixed(5)}, {value.lng!.toFixed(5)})
            <button type="button" onClick={quitarPunto} className="text-silver hover:text-white" aria-label="Quitar punto"><X className="w-3.5 h-3.5" /></button>
          </span>
        ) : (
          <span className="text-silver/60">Sin punto en el mapa: se usará solo la dirección escrita.</span>
        )}
      </div>
      {geo && <p className="text-xs text-yellow-400">{geo}</p>}

      {/* Manual address is always editable */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-ui font-medium text-silver">Dirección de la oficina (puedes corregirla)</label>
        <textarea rows={2} maxLength={300} value={value.direccion}
          onChange={(e) => onChange({ ...value, direccion: e.target.value, ubicacion_fuente: value.lat !== null ? value.ubicacion_fuente : e.target.value ? "manual" : null })}
          className="w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff]" aria-invalid={!!error} />
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      </div>
    </div>
  );
}
