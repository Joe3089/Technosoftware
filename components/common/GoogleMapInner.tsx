"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

declare global {
  interface Window { google?: any; __gmapsLoading?: Promise<void> }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT_CENTER = { lat: 10.48, lng: -66.87 }; // Caracas

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmapsLoading) return window.__gmapsLoading;
  window.__gmapsLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&language=es&loading=async&callback=__gmapsReady`;
    s.async = true;
    (window as any).__gmapsReady = () => resolve();
    s.onerror = () => { window.__gmapsLoading = undefined; reject(); };
    document.head.appendChild(s);
  });
  return window.__gmapsLoading;
}

interface Props {
  onAddressChange?: (address: string, latlng: { lat: number; lng: number }) => void;
}

export default function GoogleMapInner({ onAddressChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [embedCenter, setEmbedCenter] = useState(DEFAULT_CENTER);

  /* Without an API key, fall back to the keyless Google Maps embed */
  useEffect(() => {
    if (API_KEY) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => setEmbedCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* user denied — stay at default view */ }
    );
  }, []);

  useEffect(() => {
    if (!API_KEY || !containerRef.current) return;
    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;
      const { maps } = window.google;
      const map = new maps.Map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 12,
        streetViewControl: false,
        mapTypeControl: false,
      });
      const geocoder = new maps.Geocoder();
      let marker: any = null;

      function reverseGeocode(lat: number, lng: number) {
        setLoading(true);
        geocoder.geocode({ location: { lat, lng } }, (results: any[] | null, status: string) => {
          const addr = status === "OK" && results?.[0]
            ? results[0].formatted_address
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setAddress(addr);
          setLoading(false);
          onAddressChange?.(addr, { lat, lng });
        });
      }

      function placeMarker(lat: number, lng: number) {
        if (marker) marker.setMap(null);
        marker = new maps.Marker({ position: { lat, lng }, map, draggable: true });
        marker.addListener("dragend", (e: any) => reverseGeocode(e.latLng.lat(), e.latLng.lng()));
        reverseGeocode(lat, lng);
      }

      map.addListener("click", (e: any) => placeMarker(e.latLng.lat(), e.latLng.lng()));

      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const { latitude: lat, longitude: lng } = pos.coords;
          map.setCenter({ lat, lng });
          map.setZoom(15);
          placeMarker(lat, lng);
        },
        () => { /* user denied — stay at default view */ }
      );
    }).catch(() => setError("No se pudo cargar Google Maps"));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!API_KEY) {
    return (
      <iframe
        title="Mapa"
        src={`https://maps.google.com/maps?q=${embedCenter.lat},${embedCenter.lng}&z=14&hl=es&output=embed`}
        className="w-full rounded-xl border border-glass-bd"
        style={{ height: 320 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-glass-bd bg-navy-mid/40 flex items-center justify-center"
        style={{ height: 320 }}
      >
        {error && <span className="text-xs font-ui text-silver/70 px-4 text-center">{error}</span>}
      </div>
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
