"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Paperclip, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelShell, Estado, cardStyle } from "../proyectos/comun";
import { estadoLabel } from "../../solicitudes/resultado";

const ESTADOS: Record<string, string[]> = {
  consultorias: ["recibida", "en_revision", "respondida", "cerrada"],
  solicitudes_proyecto: ["pendiente_revision", "en_revision", "aprobada", "rechazada"],
  reuniones: ["pendiente_confirmacion", "confirmada", "reprogramar", "cancelada"],
};

// Fields shown in the detail view (label, key)
const DETALLE: Record<string, [string, string][]> = {
  consultorias: [["Descripción", "descripcion"], ["Situación actual", "situacion_actual"], ["Problema", "problema"], ["Resultado esperado", "resultado_esperado"], ["Observaciones", "observaciones"]],
  solicitudes_proyecto: [
    ["Empresa", "empresa"], ["Responsable", "responsable"], ["Sector", "sector"], ["Descripción", "descripcion"], ["Problema", "problema"],
    ["Objetivo", "objetivo"], ["Objetivos específicos", "objetivos_especificos"], ["Público", "publico"], ["Beneficios", "beneficios"],
    ["Funcionalidades", "funcionalidades"], ["Req. funcionales", "req_funcionales"], ["Req. no funcionales", "req_no_funcionales"],
    ["Plataformas", "plataformas"], ["Integraciones", "integraciones"], ["Restricciones", "restricciones"], ["Seguridad", "seguridad"],
    ["Inicio deseado", "fecha_inicio_deseada"], ["Entrega", "fecha_entrega"], ["Presupuesto (USD)", "presupuesto"], ["Riesgos", "riesgos"], ["Enlaces", "enlaces"],
  ],
};

type Row = Record<string, any>;

function EstadoSelect({ tabla, id, value, onSaved }: { tabla: string; id: string; value: string; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function cambiar(estado: string) {
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/solicitudes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tabla, id, estado }) });
    setBusy(false);
    if (!r.ok) setErr((await r.json().catch(() => ({}))).error ?? "Error"); else onSaved();
  }
  return (
    <span className="inline-flex items-center gap-2">
      <select value={value} disabled={busy} onChange={(e) => cambiar(e.target.value)} aria-label="Cambiar estado"
        className="rounded-lg border border-glass-bd bg-navy-deep/60 px-2 py-1 text-xs text-[#f0f4ff]">
        {ESTADOS[tabla].map((s) => <option key={s} value={s}>{estadoLabel(s)}</option>)}
      </select>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </span>
  );
}

function Reunion({ r, onSaved }: { r: Row; onSaved: () => void }) {
  const cuando = new Intl.DateTimeFormat("es", { dateStyle: "full", timeStyle: "short", timeZone: r.zona_horaria }).format(new Date(r.fecha_hora));
  return (
    <div className="mt-3 rounded-xl border border-yellow-400/30 p-3 flex flex-col gap-2 text-xs text-silver">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[#f0f4ff] font-ui font-semibold"><Calendar className="w-3.5 h-3.5 text-yellow-400" /> Reunión {r.modalidad}</span>
        <EstadoSelect tabla="reuniones" id={r.id} value={r.estado} onSaved={onSaved} />
      </div>
      <p>{cuando} <span className="text-silver/60">({r.zona_horaria})</span></p>
      <p>Motivo: <span className="text-[#f0f4ff]">{r.motivo}</span></p>
      <p>Tel.: {r.telefono}{r.canales?.length ? ` · ${r.canales.join(", ")}` : ""} · {[r.email_personal, r.email_corporativo].filter(Boolean).join(" · ")}{r.empresa && ` · ${r.empresa}`}</p>
      {r.direccion && (
        <p className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0 text-blue-accent" />
          {r.direccion}
          {r.lat !== null && <a className="text-blue-accent underline" target="_blank" rel="noopener noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}>ver mapa</a>}
          {r.lat === null && <span className="text-silver/50">(sin coordenadas)</span>}
        </p>
      )}
      {r.observaciones && <p>Obs.: {r.observaciones}</p>}
    </div>
  );
}

export default function SolicitudesPanel() {
  const [tab, setTab] = useState<"consultorias" | "solicitudes_proyecto">("consultorias");
  const [data, setData] = useState<{ consultorias: Row[]; solicitudes: Row[] } | null>(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setError("");
    fetch("/api/admin/solicitudes").then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); })
      .catch((e) => setError(e.message || "No se pudieron cargar las solicitudes"));
  }, []);
  useEffect(cargar, [cargar]);

  const lista = data ? (tab === "consultorias" ? data.consultorias : data.solicitudes) : [];
  const f = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

  return (
    <PanelShell title="Solicitudes" subtitle="Consultorías, solicitudes de nuevos proyectos y reuniones pendientes.">
      <div className="flex gap-2">
        {([["consultorias", "Consultorías", data?.consultorias.length], ["solicitudes_proyecto", "Nuevos proyectos", data?.solicitudes.length]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-ui border", tab === k ? "border-blue-accent/60 bg-blue-accent/20 text-[#f0f4ff]" : "border-glass-bd text-silver hover:text-white")}>
            {l}{n !== undefined && <span className="ml-1.5 text-silver/70">{n}</span>}
          </button>
        ))}
      </div>

      {lista.map((s) => {
        const open = abierto === s.id;
        return (
          <div key={s.id} className="rounded-2xl border border-glass-bd p-4 sm:p-5 flex flex-col gap-2" style={cardStyle}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-ui font-semibold text-[#f0f4ff]">{s.nombre ?? s.objetivo}{s.proyecto && <span className="text-silver font-normal"> · {s.proyecto.nombre}</span>}{s.gratuita && <span className="text-status-green font-normal"> · Gratuita</span>}</p>
                <p className="text-xs text-silver/60"><span className="font-mono">{s.codigo}</span> · {f.format(new Date(s.created_at))} · {s.cliente?.full_name || s.cliente?.email} · prioridad {s.prioridad}</p>
              </div>
              <EstadoSelect tabla={tab} id={s.id} value={s.estado} onSaved={cargar} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <button onClick={() => setAbierto(open ? null : s.id)} className="flex items-center gap-1 text-blue-accent">
                Detalle <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
              </button>
              {s.reunion && <span className="text-yellow-400">Reunión: {estadoLabel(s.reunion.estado)}</span>}
              {s.adjuntos?.length > 0 && <span className="text-silver"><Paperclip className="inline w-3.5 h-3.5" /> {s.adjuntos.length}</span>}
            </div>
            {open && (
              <div className="flex flex-col gap-2 text-sm">
                {DETALLE[tab].map(([l, k]) => {
                  const v = Array.isArray(s[k]) ? s[k].join(", ") : s[k];
                  return v ? <div key={k}><p className="text-xs text-silver/60">{l}</p><p className="text-[#f0f4ff] whitespace-pre-line break-words">{String(v)}</p></div> : null;
                })}
                {s.adjuntos?.map((a: Row) => (
                  <a key={a.id} href={`/api/adjuntos/${a.id}`} className="text-xs text-blue-accent underline flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" /> {a.nombre} ({(a.tamano / 1024 / 1024).toFixed(2)} MB)
                  </a>
                ))}
                {s.reunion && <Reunion r={s.reunion} onSaved={cargar} />}
              </div>
            )}
          </div>
        );
      })}

      <Estado loading={!data && !error} error={error} vacio={!!data && !lista.length} onRetry={cargar} mensajeVacio="No hay solicitudes todavía." />
    </PanelShell>
  );
}
