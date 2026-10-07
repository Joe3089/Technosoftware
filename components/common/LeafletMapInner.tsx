"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface Props {
  onAddressChange?: (address: string, latlng: { lat: number; lng: number }) => void;
}

export default function LeafletMapInner({ onAddressChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<import("leaflet").Map | null>(null);
  const markerRef    = useRef<import("leaflet").Marker | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function reverseGeocode(lat: number, lng: number) {
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();
      const addr = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(addr);
      onAddressChange?.(addr, { lat, lng });
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoading(false);
    }
  }

  function placeMarker(L: typeof import("leaflet"), map: import("leaflet").Map, lat: number, lng: number) {
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
    markerRef.current.on("dragend", (e) => {
      const ll = (e.target as import("leaflet").Marker).getLatLng();
      reverseGeocode(ll.lat, ll.lng);
    });
    reverseGeocode(lat, lng);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cleanup = false;

    import("leaflet").then((L) => {
      if (cleanup || !containerRef.current) return;

      /* Leaflet icon fix for Next.js bundler */
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        attributionControl: true,
      }).setView([10.48, -66.87], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e) => placeMarker(L, map, e.latlng.lat, e.latlng.lng));
      mapRef.current = map;

      /* Try geolocation */
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mapRef.current) return;
            map.setView([pos.coords.latitude, pos.coords.longitude], 15);
            placeMarker(L, map, pos.coords.latitude, pos.coords.longitude);
          },
          () => { /* user denied — stay at default view */ }
        );
      }

      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      cleanup = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-glass-bd"
        style={{ height: 320, zIndex: 0 }}
      />
      {/* Address readout */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-accent/5 border border-blue-accent/15 min-h-[44px]">
        <MapPin className="w-4 h-4 text-blue-accent shrink-0 mt-0.5" />
        <span className="text-xs font-ui text-silver leading-relaxed">
          {loading
            ? "Obteniendo dirección…"
            : address || "Haz clic en el mapa para seleccionar una ubicación"}
        </span>
      </div>
    </div>
  );
}
