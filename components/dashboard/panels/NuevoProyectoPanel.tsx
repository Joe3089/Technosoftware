"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Send, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalData } from "@/hooks/usePersonalData";
import { cn } from "@/lib/utils";
import { PanelShell } from "./proyectos/comun";
import { Texto, Area, Selector, Seccion, Campo, Adjuntos, Aviso, PRIORIDAD_OPTS, adjuntosValidos, subirAdjuntos, separarErrores, type Errores } from "../solicitudes/campos";
import ReunionForm, { reunionInicial, validarReunionCliente, reunionPayload, type Reunion } from "../solicitudes/ReunionForm";
import { Confirmacion, MisSolicitudes, type Enviado } from "../solicitudes/resultado";

const VACIO = {
  nombre: "", empresa: "", responsable: "", sector: "", descripcion: "",
  problema: "", objetivo: "", objetivos_especificos: "", publico: "", beneficios: "",
  funcionalidades: "", req_funcionales: "", req_no_funcionales: "", integraciones: "", restricciones: "", seguridad: "",
  fecha_inicio_deseada: "", fecha_entrega: "", prioridad: "media", presupuesto: "", riesgos: "",
};
type Form = typeof VACIO;

const PASOS = ["Información general", "Necesidad y objetivos", "Alcance", "Planificación", "Referencias", "Reunión", "Revisar"] as const;
const PLATAFORMAS: [string, string][] = [["web", "Web"], ["movil", "Móvil"], ["escritorio", "Escritorio"], ["otra", "Otra"]];

/** Required fields per step (validated again on the server). */
const REQUERIDOS: Record<number, (keyof Form)[]> = { 0: ["nombre", "responsable", "descripcion"], 1: ["problema", "objetivo"], 2: ["funcionalidades"] };

export default function NuevoProyectoPanel() {
  const { user } = useAuth(false);
  const { data: perfil } = usePersonalData();
  const [paso, setPaso] = useState(0);
  const [f, setF] = useState<Form>(VACIO);
  const [plataformas, setPlataformas] = useState<string[]>([]);
  const [enlaces, setEnlaces] = useState<string[]>([]);
  const [enlace, setEnlace] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [conReunion, setConReunion] = useState(false);
  const [reunion, setReunion] = useState<Reunion>(() => reunionInicial());
  const [errores, setErrores] = useState<Errores>({});
  const [errReunion, setErrReunion] = useState<Errores>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<Enviado | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const nombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(" ");
    setF((x) => ({ ...x, responsable: x.responsable || nombre, empresa: x.empresa || perfil.empresa }));
    setReunion((r) => ({ ...r, email_personal: r.email_personal || perfil.correo || user?.email || "", telefono: r.telefono || perfil.telMov || "", empresa: r.empresa || perfil.empresa || "" }));
  }, [perfil, user]);

  const set = (k: keyof Form) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  function validarPaso(p: number): Errores {
    const e: Errores = {};
    for (const k of REQUERIDOS[p] ?? []) if (!f[k].trim()) e[k] = "Obligatorio";
    if (p === 2 && !plataformas.length) e.plataformas = "Selecciona al menos una plataforma";
    if (p === 3) {
      if (f.fecha_inicio_deseada && f.fecha_entrega && f.fecha_entrega < f.fecha_inicio_deseada) e.fecha_entrega = "Debe ser posterior a la fecha de inicio";
      if (f.presupuesto && !(Number(f.presupuesto) >= 0)) e.presupuesto = "Monto inválido";
    }
    if (p === 4 && !adjuntosValidos(files)) e.adjuntos = "Quita los archivos no permitidos";
    return e;
  }

  function siguiente() {
    const e = validarPaso(paso);
    const er = paso === 5 && conReunion ? validarReunionCliente(reunion) : {};
    setErrores(e); setErrReunion(er);
    if (Object.keys(e).length || Object.keys(er).length) return;
    setPaso((p) => p + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function agregarEnlace() {
    const u = enlace.trim();
    if (!/^https?:\/\/\S+$/i.test(u)) { setErrores({ enlaces: "Usa un enlace que empiece por http(s)://" }); return; }
    setEnlaces((l) => [...l, u].slice(0, 10)); setEnlace(""); setErrores({});
  }

  async function enviar() {
    setError(""); setEnviando(true);
    try {
      const r = await fetch("/api/solicitudes-proyecto", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, plataformas, enlaces, presupuesto: f.presupuesto || null, reunion: conReunion ? reunionPayload(reunion) : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const s = separarErrores(j.errores ?? {});
        setErrores(s.form); setErrReunion(s.reunion);
        // Jump back to the first step with an error
        const pasoErr = Object.keys(s.reunion).length ? 5 : [0, 1, 2, 3].find((p) => (REQUERIDOS[p] ?? []).some((k) => s.form[k])) ?? paso;
        setPaso(pasoErr);
        throw new Error(j.error ?? "No se pudo enviar la solicitud");
      }
      const fallidos = await subirAdjuntos("solicitud", j.id, files);
      setEnviado({ codigo: j.codigo, estado: j.estado, reunion: j.reunion, fallidos });
      setVersion((v) => v + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  function nueva() {
    setEnviado(null); setPaso(0); setF({ ...VACIO, responsable: f.responsable, empresa: f.empresa });
    setPlataformas([]); setEnlaces([]); setFiles([]); setConReunion(false);
  }

  const resumen: [string, string][] = [
    ["Nombre", f.nombre], ["Empresa", f.empresa], ["Responsable", f.responsable], ["Sector", f.sector],
    ["Objetivo", f.objetivo], ["Plataformas", plataformas.map((p) => PLATAFORMAS.find((x) => x[0] === p)?.[1]).join(", ")],
    ["Inicio deseado", f.fecha_inicio_deseada], ["Entrega objetivo", f.fecha_entrega],
    ["Prioridad", PRIORIDAD_OPTS.find((p) => p[0] === f.prioridad)?.[1] ?? ""], ["Presupuesto", f.presupuesto ? `${f.presupuesto} USD` : ""],
    ["Adjuntos", files.map((x) => x.name).join(", ")], ["Enlaces", enlaces.join(", ")],
    ["Reunión", conReunion ? `${reunion.fecha} ${reunion.hora} (${reunion.zona_horaria}) · ${reunion.modalidad}` : "No solicitada"],
  ];

  return (
    <PanelShell title="Nuevo Proyecto" subtitle="Cuéntanos tu idea: con este levantamiento preparamos una propuesta. Quedará pendiente de revisión.">
      {enviado ? <Confirmacion titulo="Solicitud de proyecto enviada" r={enviado} onNueva={nueva} /> : (
        <div className="flex flex-col gap-5">
          {/* Stepper */}
          <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Pasos">
            {PASOS.map((t, i) => (
              <li key={t} className="flex-1 min-w-[72px]">
                <button type="button" disabled={i > paso} onClick={() => setPaso(i)} aria-current={i === paso ? "step" : undefined}
                  className="w-full flex flex-col gap-1 text-left disabled:cursor-not-allowed">
                  <span className={cn("h-1.5 rounded-full", i < paso ? "bg-status-green" : i === paso ? "bg-blue-accent" : "bg-navy-mid")} />
                  <span className={cn("text-[11px] font-ui truncate", i === paso ? "text-[#f0f4ff] font-semibold" : "text-silver/60")}>{i + 1}. {t}</span>
                </button>
              </li>
            ))}
          </ol>

          {paso === 0 && (
            <Seccion titulo="A. Información general">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Texto label="Nombre provisional del proyecto" req value={f.nombre} onChange={set("nombre")} error={errores.nombre} max={160} />
                <Texto label="Empresa u organización" value={f.empresa} onChange={set("empresa")} max={160} />
                <Texto label="Responsable de la solicitud" req value={f.responsable} onChange={set("responsable")} error={errores.responsable} max={160} />
                <Texto label="Sector o actividad" value={f.sector} onChange={set("sector")} max={160} placeholder="Ej. Retail, salud, logística" />
              </div>
              <Area label="Descripción general de la idea" req value={f.descripcion} onChange={set("descripcion")} error={errores.descripcion} max={4000} rows={4} />
            </Seccion>
          )}

          {paso === 1 && (
            <Seccion titulo="B. Necesidad y objetivos">
              <Area label="Problema que se desea resolver" req value={f.problema} onChange={set("problema")} error={errores.problema} max={3000} />
              <Texto label="Objetivo principal" req value={f.objetivo} onChange={set("objetivo")} error={errores.objetivo} max={1000} />
              <Area label="Objetivos específicos" value={f.objetivos_especificos} onChange={set("objetivos_especificos")} max={3000} />
              <Area label="Público objetivo o usuarios finales" value={f.publico} onChange={set("publico")} max={1000} rows={2} />
              <Area label="Beneficios esperados" value={f.beneficios} onChange={set("beneficios")} rows={2} />
            </Seccion>
          )}

          {paso === 2 && (
            <Seccion titulo="C. Alcance y requerimientos">
              <Area label="Funcionalidades principales" req value={f.funcionalidades} onChange={set("funcionalidades")} error={errores.funcionalidades} max={4000} rows={4} />
              <Campo label="Plataformas previstas" req error={errores.plataformas}>
                {() => (
                  <div className="flex flex-wrap gap-2">
                    {PLATAFORMAS.map(([v, l]) => (
                      <button key={v} type="button" aria-pressed={plataformas.includes(v)}
                        onClick={() => setPlataformas((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))}
                        className={cn("px-4 py-2 rounded-lg border text-sm font-ui", plataformas.includes(v) ? "border-blue-accent/60 bg-blue-accent/20 text-[#f0f4ff]" : "border-glass-bd text-silver hover:text-white")}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </Campo>
              <Area label="Requerimientos funcionales" value={f.req_funcionales} onChange={set("req_funcionales")} max={4000} />
              <Area label="Requerimientos no funcionales (rendimiento, disponibilidad…)" value={f.req_no_funcionales} onChange={set("req_no_funcionales")} max={3000} rows={2} />
              <Area label="Integraciones con sistemas externos" value={f.integraciones} onChange={set("integraciones")} rows={2} />
              <Area label="Restricciones técnicas conocidas" value={f.restricciones} onChange={set("restricciones")} rows={2} />
              <Area label="Seguridad, permisos y protección de datos" value={f.seguridad} onChange={set("seguridad")} rows={2} />
            </Seccion>
          )}

          {paso === 3 && (
            <Seccion titulo="D. Planificación">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Texto label="Fecha deseada de inicio" type="date" value={f.fecha_inicio_deseada} onChange={set("fecha_inicio_deseada")} />
                <Texto label="Fecha objetivo de entrega" type="date" value={f.fecha_entrega} onChange={set("fecha_entrega")} error={errores.fecha_entrega} />
                <Selector label="Prioridad" req value={f.prioridad} onChange={set("prioridad")} options={PRIORIDAD_OPTS} />
                <Texto label="Presupuesto estimado (USD)" type="number" value={f.presupuesto} onChange={set("presupuesto")} error={errores.presupuesto} hint="Solo si deseas indicarlo" />
              </div>
              <Area label="Dependencias, riesgos y observaciones" value={f.riesgos} onChange={set("riesgos")} max={3000} />
            </Seccion>
          )}

          {paso === 4 && (
            <Seccion titulo="E. Material de referencia">
              <Adjuntos files={files} onChange={setFiles} />
              {errores.adjuntos && <p className="text-xs text-red-400">{errores.adjuntos}</p>}
              <Campo label="Enlaces de referencia" error={errores.enlaces}>
                {(id) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input id={id} value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://…" maxLength={500}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarEnlace(); } }}
                        className="w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff]" />
                      <button type="button" onClick={agregarEnlace} className="px-3 rounded-lg border border-glass-bd text-silver hover:text-white" aria-label="Agregar enlace"><Plus className="w-4 h-4" /></button>
                    </div>
                    {enlaces.map((u, i) => (
                      <span key={i} className="flex items-center justify-between gap-2 rounded-lg border border-glass-bd px-3 py-1.5 text-xs text-silver">
                        <span className="truncate">{u}</span>
                        <button type="button" onClick={() => setEnlaces((l) => l.filter((_, j) => j !== i))} aria-label="Quitar enlace"><X className="w-3.5 h-3.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </Campo>
            </Seccion>
          )}

          {paso === 5 && (
            <>
              <label className="flex items-center gap-3 rounded-2xl border border-glass-bd px-4 py-3 cursor-pointer hover:border-blue-accent/40">
                <input type="checkbox" checked={conReunion} onChange={(e) => setConReunion(e.target.checked)} className="w-4 h-4 accent-[#4d7fff]" />
                <span className="text-sm font-ui text-[#f0f4ff]">¿Necesitas conversar directamente con un consultor?</span>
              </label>
              {conReunion ? <ReunionForm value={reunion} onChange={setReunion} errores={errReunion} />
                : <p className="text-xs text-silver/60">Es opcional: puedes enviar el levantamiento sin solicitar una reunión.</p>}
            </>
          )}

          {paso === 6 && (
            <Seccion titulo="Revisa tu solicitud">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {resumen.map(([k, v]) => (
                  <div key={k} className="flex flex-col"><dt className="text-xs text-silver/60">{k}</dt><dd className="text-[#f0f4ff] break-words">{v || "—"}</dd></div>
                ))}
              </dl>
              <p className="text-xs text-silver/60">Al enviarla quedará «Pendiente de revisión». No se crea un proyecto hasta que el equipo la apruebe.</p>
            </Seccion>
          )}

          {error && <Aviso>{error}</Aviso>}

          <div className="flex flex-wrap gap-3">
            {paso > 0 && (
              <button type="button" onClick={() => setPaso((p) => p - 1)} disabled={enviando}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white hover:bg-white/5">
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>
            )}
            {paso < PASOS.length - 1 ? (
              <button type="button" onClick={siguiente} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui font-semibold text-white hover:shadow-glow">
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={enviar} disabled={enviando}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui font-semibold text-white hover:shadow-glow disabled:opacity-60">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {enviando ? "Enviando…" : "Enviar solicitud"}
              </button>
            )}
          </div>
        </div>
      )}
      <MisSolicitudes url="/api/solicitudes-proyecto" version={version} />
    </PanelShell>
  );
}
