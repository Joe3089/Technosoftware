"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Texto, Area, Selector, Seccion, Campo, type Errores } from "./campos";
import type { Ubicacion } from "./UbicacionPicker";

const UbicacionPicker = dynamic(() => import("./UbicacionPicker"), { ssr: false });

export interface Reunion extends Ubicacion {
  telefono: string;
  canales: string[];
  email_personal: string;
  email_corporativo: string;
  empresa: string;
  fecha: string;
  hora: string;
  zona_horaria: string;
  modalidad: "virtual" | "presencial";
  motivo: string;
  observaciones: string;
}

export function reunionInicial(pref: { email?: string; telefono?: string; empresa?: string } = {}): Reunion {
  return {
    telefono: pref.telefono ?? "", canales: [], email_personal: pref.email ?? "", email_corporativo: "", empresa: pref.empresa ?? "",
    direccion: "", lat: null, lng: null, place_id: null, ubicacion_fuente: null,
    fecha: "", hora: "", zona_horaria: Intl.DateTimeFormat().resolvedOptions().timeZone, modalidad: "virtual", motivo: "", observaciones: "",
  };
}

const PHONE = /^\+?[0-9\s().-]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks (the server repeats them). */
export function validarReunionCliente(r: Reunion): Errores {
  const e: Errores = {};
  if (!PHONE.test(r.telefono.trim()) || r.telefono.replace(/\D/g, "").length < 7) e.telefono = "Teléfono inválido (ej. +58 412 1234567)";
  if (r.email_personal && !EMAIL.test(r.email_personal)) e.email_personal = "Correo inválido";
  if (r.email_corporativo && !EMAIL.test(r.email_corporativo)) e.email_corporativo = "Correo inválido";
  if (!r.email_personal && !r.email_corporativo) e.email_personal = "Indica al menos un correo";
  if (r.modalidad === "presencial" && !r.direccion.trim()) e.direccion = "La dirección es obligatoria para reuniones presenciales";
  if (!r.fecha || !r.hora) e.fecha = "Indica fecha y hora";
  if (!r.motivo.trim()) e.motivo = "Indica el motivo de la reunión";
  return e;
}

export const reunionPayload = ({ fecha, hora, ...r }: Reunion) => ({ ...r, fecha, hora });

function offsetLabel(tz: string, fecha: string, hora: string) {
  try {
    const d = fecha && hora ? new Date(`${fecha}T${hora}:00Z`) : new Date();
    const p = new Intl.DateTimeFormat("es", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(d);
    return p.find((x) => x.type === "timeZoneName")?.value.replace("GMT", "UTC") ?? "";
  } catch { return ""; }
}

export default function ReunionForm({ value, onChange, errores }: {
  value: Reunion; onChange: (fn: (r: Reunion) => Reunion) => void; errores: Errores;
}) {
  const set = <K extends keyof Reunion>(k: K) => (v: Reunion[K]) => onChange((r) => ({ ...r, [k]: v }));
  const zonas = useMemo(() => {
    try { return (Intl as any).supportedValuesOf("timeZone") as string[]; } catch { return [value.zona_horaria]; }
  }, [value.zona_horaria]);
  const hoy = new Date().toISOString().slice(0, 10);
  const toggleCanal = (c: string) => onChange((r) => ({ ...r, canales: r.canales.includes(c) ? r.canales.filter((x) => x !== c) : [...r.canales, c] }));

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 text-xs text-silver/70">
        <Info className="w-4 h-4 shrink-0 text-blue-accent" />
        La reunión quedará <strong className="text-[#f0f4ff]">pendiente de confirmación</strong>: el consultor revisará su disponibilidad y te contactará.
      </p>

      <Seccion titulo="Datos de contacto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Texto label="Teléfono" req value={value.telefono} onChange={set("telefono")} error={errores.telefono} type="tel" max={20} placeholder="+58 412 1234567" />
          <Campo label="Disponible por" error={errores.canales} hint="Marca solo los que uses">
            {() => (
              <div className="flex gap-2">
                {[["whatsapp", "WhatsApp"], ["telegram", "Telegram"]].map(([c, l]) => (
                  <button key={c} type="button" onClick={() => toggleCanal(c)} aria-pressed={value.canales.includes(c)}
                    className={cn("flex-1 py-2 rounded-lg border text-sm font-ui transition-colors",
                      value.canales.includes(c) ? "border-status-green/50 bg-status-green/10 text-status-green" : "border-glass-bd text-silver hover:text-white")}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </Campo>
          <Texto label="Correo personal" value={value.email_personal} onChange={set("email_personal")} error={errores.email_personal} type="email" max={254} hint="Indica al menos un correo" />
          <Texto label="Correo corporativo" value={value.email_corporativo} onChange={set("email_corporativo")} error={errores.email_corporativo} type="email" max={254} />
          <Texto label="Empresa que representas" value={value.empresa} onChange={set("empresa")} max={160} />
        </div>
      </Seccion>

      <Seccion titulo="Fecha y modalidad">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Campo label="Fecha" req error={errores.fecha}>
            {(id, inv) => <input id={id} type="date" min={hoy} value={value.fecha} onChange={(e) => set("fecha")(e.target.value)} aria-invalid={inv}
              className="w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff] [color-scheme:dark]" />}
          </Campo>
          <Campo label="Hora" req>
            {(id) => <input id={id} type="time" value={value.hora} onChange={(e) => set("hora")(e.target.value)}
              className="w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff] [color-scheme:dark]" />}
          </Campo>
          <Campo label="Zona horaria" req error={errores.zona_horaria} hint={offsetLabel(value.zona_horaria, value.fecha, value.hora)}>
            {(id) => (
              <select id={id} value={value.zona_horaria} onChange={(e) => set("zona_horaria")(e.target.value)}
                className="w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff]">
                {zonas.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
              </select>
            )}
          </Campo>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Selector label="Modalidad" req value={value.modalidad} onChange={(v) => set("modalidad")(v as Reunion["modalidad"])}
            options={[["virtual", "Virtual (videollamada)"], ["presencial", "Presencial"]]} />
          <div className="sm:col-span-2">
            <Texto label="Motivo u objetivo de la reunión" req value={value.motivo} onChange={set("motivo")} error={errores.motivo} max={1000} />
          </div>
        </div>
        <Area label="Observaciones" value={value.observaciones} onChange={set("observaciones")} max={1000} rows={2} />
      </Seccion>

      <Seccion titulo={`Ubicación de la oficina${value.modalidad === "presencial" ? " (obligatoria)" : ""}`}>
        <UbicacionPicker value={value} error={errores.direccion}
          onChange={(u) => onChange((r) => ({ ...r, ...u }))} />
      </Seccion>
    </div>
  );
}
