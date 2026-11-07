"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalData } from "@/hooks/usePersonalData";
import { ESTADO_LABEL } from "@/lib/proyectos";
import { PanelShell } from "./proyectos/comun";
import TasasTicker from "@/components/common/TasasTicker";
import { Texto, Area, Selector, Seccion, Adjuntos, Aviso, PRIORIDAD_OPTS, adjuntosValidos, subirAdjuntos, separarErrores, type Errores } from "../solicitudes/campos";
import ReunionForm, { reunionInicial, validarReunionCliente, reunionPayload, type Reunion } from "../solicitudes/ReunionForm";
import { Confirmacion, MisSolicitudes, type Enviado } from "../solicitudes/resultado";

interface Proy { id: string; nombre: string; estado: string }

const VACIO = { proyecto_id: "", objetivo: "", descripcion: "", situacion_actual: "", problema: "", resultado_esperado: "", prioridad: "media", observaciones: "" };

export default function ConsultoriaPanel() {
  const { user } = useAuth(false);
  const { data: perfil } = usePersonalData();
  const [proyectos, setProyectos] = useState<Proy[] | null>(null);
  const [errProy, setErrProy] = useState("");
  const [gratuita, setGratuita] = useState(false);
  const [f, setF] = useState(VACIO);
  const [files, setFiles] = useState<File[]>([]);
  const [conReunion, setConReunion] = useState(false);
  const [reunion, setReunion] = useState<Reunion>(() => reunionInicial());
  const [errores, setErrores] = useState<Errores>({});
  const [errReunion, setErrReunion] = useState<Errores>({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<Enviado | null>(null);
  const [version, setVersion] = useState(0);

  // Only the user's projects in development (all pages)
  useEffect(() => {
    (async () => {
      try {
        const all: Proy[] = [];
        for (let p = 0; ; p++) {
          const r = await fetch(`/api/proyectos?grupo=activos&pagina=${p}`);
          const j = await r.json();
          if (!r.ok) throw new Error(j.error);
          all.push(...j.proyectos);
          if (!j.hayMas) break;
        }
        const cupo = await fetch("/api/consultorias?cupo=1").then((r) => r.json()).catch(() => ({}));
        setGratuita(!!cupo.gratuitaDisponible);
        setProyectos(all);
        if (all.length === 1) setF((x) => ({ ...x, proyecto_id: all[0].id }));
        else if (!all.length && cupo.gratuitaDisponible) setF((x) => ({ ...x, proyecto_id: "gratuita" }));
      } catch { setErrProy("No se pudieron cargar tus proyectos."); }
    })();
  }, []);

  // Prefill contact data from the profile (editable)
  useEffect(() => {
    setReunion((r) => ({ ...r, email_personal: r.email_personal || perfil.correo || user?.email || "", telefono: r.telefono || perfil.telMov || "", empresa: r.empresa || perfil.empresa || "" }));
  }, [perfil, user]);

  const set = (k: keyof typeof VACIO) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const ef: Errores = {};
    if (!f.proyecto_id) ef.proyecto_id = "Selecciona un proyecto";
    if (!f.objetivo.trim()) ef.objetivo = "Obligatorio";
    if (!f.descripcion.trim()) ef.descripcion = "Obligatorio";
    const er = conReunion ? validarReunionCliente(reunion) : {};
    setErrores(ef); setErrReunion(er);
    if (Object.keys(ef).length || Object.keys(er).length) { setError("Revisa los campos marcados."); return; }
    if (!adjuntosValidos(files)) { setError("Quita los archivos no permitidos antes de enviar."); return; }

    setEnviando(true);
    try {
      const r = await fetch("/api/consultorias", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, reunion: conReunion ? reunionPayload(reunion) : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const s = separarErrores(j.errores ?? {});
        setErrores(s.form); setErrReunion(s.reunion);
        throw new Error(j.error ?? "No se pudo enviar la consultoría");
      }
      const fallidos = await subirAdjuntos("consultoria", j.id, files);
      setEnviado({ codigo: j.codigo, estado: j.estado, reunion: j.reunion, fallidos });
      if (f.proyecto_id === "gratuita") setGratuita(false);
      setVersion((v) => v + 1);
    } catch (err) {
      setError((err as Error).message); // form data is kept for retry
    } finally {
      setEnviando(false);
    }
  }

  function nueva() {
    setEnviado(null); setF({ ...VACIO, proyecto_id: proyectos?.length === 1 ? proyectos[0].id : !proyectos?.length && gratuita ? "gratuita" : "" });
    setFiles([]); setConReunion(false); setReunion((r) => ({ ...reunionInicial(), email_personal: r.email_personal, telefono: r.telefono, empresa: r.empresa }));
  }

  // Without a contracted project only the single free consultation is available
  const sinProyectos = proyectos?.length === 0 && !gratuita;
  const opciones: [string, string][] = [
    ...(proyectos ?? []).map((p): [string, string] => [p.id, `${p.nombre} · ${ESTADO_LABEL[p.estado]} · #${p.id.slice(0, 8)}`]),
    ...(gratuita ? [["gratuita", "Consultoría gratuita · sin proyecto contratado"] as [string, string]] : []),
  ];

  return (
    <PanelShell title="Consultoría" subtitle="Envía dudas, incidencias o requerimientos. Los interesados tienen 1 consultoría gratuita; las demás son para proyectos contratados.">
      <TasasTicker />
      {enviado ? <Confirmacion titulo="Consultoría enviada" r={enviado} onNueva={nueva} /> : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
          {errProy && <Aviso>{errProy}</Aviso>}
          {!proyectos && !errProy && <Loader2 className="w-6 h-6 text-blue-accent animate-spin" />}
          {sinProyectos && <Aviso>Ya usaste tu consultoría gratuita. Las siguientes consultorías están disponibles cuando tengas un proyecto contratado; para una idea nueva usa «Nuevo Proyecto».</Aviso>}
          {proyectos && gratuita && (
            <p className="rounded-2xl border border-status-green/40 bg-status-green/10 px-4 py-3 text-sm text-status-green">
              Tienes <strong>1 consultoría gratuita</strong> disponible, sin necesidad de un proyecto contratado.
            </p>
          )}

          {proyectos && !sinProyectos && (
            <>
              <Seccion titulo="Proyecto y consulta">
                <Selector label="Proyecto" req value={f.proyecto_id} onChange={set("proyecto_id")} error={errores.proyecto_id}
                  options={[["", "Selecciona un proyecto…"], ...opciones]} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Texto label="Objetivo de la consulta" req value={f.objetivo} onChange={set("objetivo")} error={errores.objetivo} max={200}
                      placeholder="Ej. Agregar un reporte de ventas mensual" />
                  </div>
                  <Selector label="Prioridad" req value={f.prioridad} onChange={set("prioridad")} options={PRIORIDAD_OPTS} />
                </div>
                <Area label="Descripción detallada" req value={f.descripcion} onChange={set("descripcion")} error={errores.descripcion} max={4000} rows={4}
                  placeholder="Explica la necesidad, duda, incidencia o mejora" />
              </Seccion>

              <Seccion titulo="Contexto (responde solo lo que aplique)">
                <Area label="Situación actual del proyecto" value={f.situacion_actual} onChange={set("situacion_actual")} />
                <Area label="Problema o dificultad identificada" value={f.problema} onChange={set("problema")} />
                <Area label="Resultado esperado" value={f.resultado_esperado} onChange={set("resultado_esperado")} />
                <Area label="Observaciones adicionales" value={f.observaciones} onChange={set("observaciones")} rows={2} />
                <Adjuntos files={files} onChange={setFiles} />
              </Seccion>

              <label className="flex items-center gap-3 rounded-2xl border border-glass-bd px-4 py-3 cursor-pointer hover:border-blue-accent/40">
                <input type="checkbox" checked={conReunion} onChange={(e) => setConReunion(e.target.checked)} className="w-4 h-4 accent-[#4d7fff]" />
                <span className="text-sm font-ui text-[#f0f4ff]">¿Necesitas conversar directamente con el consultor responsable?</span>
              </label>
              {conReunion && <ReunionForm value={reunion} onChange={setReunion} errores={errReunion} />}

              {error && <Aviso>{error}</Aviso>}
              <button type="submit" disabled={enviando}
                className="self-start flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui font-semibold text-white hover:shadow-glow disabled:opacity-60">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {enviando ? "Enviando…" : "Enviar consultoría"}
              </button>
            </>
          )}
        </form>
      )}
      <MisSolicitudes url="/api/consultorias" version={version} />
    </PanelShell>
  );
}
