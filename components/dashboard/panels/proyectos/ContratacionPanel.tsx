"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Eye, FileSignature, Loader2, Lock, Plus, Receipt, Trash2, Upload, ClipboardCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import Estrellas from "@/components/common/Estrellas";
import {
  CONTRATO_LABEL, PREGUNTAS_ENCUESTA, totalItems,
  type Contrato, type ItemPresupuesto, type Presupuesto,
} from "@/lib/contratacion";
import { cn } from "@/lib/utils";
import { PanelShell, Estado, EstadoBadge, cardStyle, fecha, fechaHora } from "./comun";
import { Aviso } from "../../solicitudes/campos";

interface Proy { id: string; nombre: string; estado: string; cliente?: { email: string; full_name: string | null } | null }
interface Encuesta { general: number; calidad: number; comunicacion: number; plazos: number; soporte: number; recomendaria: boolean; comentario: string | null; created_at: string }
interface Datos {
  proyecto: { id: string; nombre: string; estado: string; reunion_final_at: string | null };
  presupuesto: Presupuesto | null; contrato: Contrato | null; encuesta: Encuesta | null;
}
type Tab = "presupuesto" | "contrato" | "cierre";

const usd = (n: number) => n.toLocaleString("es", { style: "currency", currency: "USD" });
const btn = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-ui font-semibold disabled:opacity-60";
const btnPrimario = cn(btn, "bg-gradient-cta text-white hover:shadow-glow");
const btnSecundario = cn(btn, "border border-glass-bd text-silver hover:text-white hover:bg-white/5");
const area = "w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2 text-sm text-[#f0f4ff] placeholder:text-silver/40 focus:outline-none focus:border-blue-accent/60";

async function enviarJson(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "No se pudo completar la acción");
}
async function subirPdf(url: string, file: File) {
  const fd = new FormData(); fd.append("archivo", file, file.name);
  const r = await fetch(url, { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "No se pudo subir el archivo");
}

function Tarjeta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-glass-bd p-4 sm:p-6 flex flex-col gap-4", className)} style={cardStyle}>{children}</div>;
}
function Bloqueado({ children }: { children: React.ReactNode }) {
  return <Tarjeta className="items-center text-center py-10"><Lock className="w-6 h-6 text-silver/50" /><p className="text-sm text-silver max-w-md">{children}</p></Tarjeta>;
}

/* ── Presupuesto ── */
function PresupuestoTab({ d, esAdmin, accion }: { d: Datos; esAdmin: boolean; accion: (fn: () => Promise<void>) => Promise<void> }) {
  const p = d.presupuesto;
  const [items, setItems] = useState<ItemPresupuesto[]>(p?.items ?? [{ concepto: "", cantidad: 1, precio: 0 }]);
  const [notas, setNotas] = useState(p?.notas ?? "");
  const [valido, setValido] = useState(p?.valido_hasta ?? "");
  const [motivo, setMotivo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const url = `/api/proyectos/${d.proyecto.id}/presupuesto`;
  const setItem = (i: number, k: keyof ItemPresupuesto, v: string) =>
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: k === "concepto" ? v : Number(v) } : x)));

  const detalle = p && (
    <Tarjeta>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-ui font-semibold text-[#f0f4ff] flex items-center gap-2"><Receipt className="w-4 h-4 text-cyan" /> Presupuesto</p>
        <span className={cn("text-xs px-2.5 py-1 rounded-full border", p.estado === "aprobado" ? "border-status-green/40 text-status-green" : p.estado === "rechazado" ? "border-red-400/40 text-red-400" : "border-cyan/40 text-cyan")}>
          {p.estado === "aprobado" ? "Aprobado" : p.estado === "rechazado" ? "Rechazado" : "Pendiente de tu respuesta"}
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-glass-bd/60">
        {p.items.map((it, i) => (
          <li key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
            <span className="flex-1 text-[#f0f4ff] break-words">{it.concepto}</span>
            <span className="text-silver/70 text-xs sm:text-sm">{it.cantidad} × {usd(it.precio)}</span>
            <span className="font-mono text-[#f0f4ff] sm:w-28 sm:text-right">{usd(it.cantidad * it.precio)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-glass-bd pt-3">
        <span className="text-sm text-silver">Total</span>
        <span className="font-mono text-xl font-bold text-gradient">{usd(p.total)}</span>
      </div>
      {p.notas && <p className="text-sm text-silver whitespace-pre-line">{p.notas}</p>}
      <p className="text-xs text-silver/60">
        {p.valido_hasta && <>Válido hasta el {fecha(p.valido_hasta)} · </>}Actualizado el {fechaHora(p.updated_at)}
      </p>
      {p.estado === "rechazado" && p.motivo_rechazo && <Aviso>Motivo del rechazo: {p.motivo_rechazo}</Aviso>}

      {!esAdmin && p.estado === "enviado" && (
        rechazando ? (
          <div className="flex flex-col gap-2">
            <textarea rows={2} className={area} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={1000}
              placeholder="Cuéntanos qué te gustaría ajustar" />
            <div className="flex flex-col sm:flex-row gap-2">
              <button className={btnSecundario} onClick={() => setRechazando(false)}>Volver</button>
              <button className={cn(btn, "border border-red-400/40 text-red-400")}
                onClick={() => accion(() => enviarJson(url, "POST", { accion: "rechazar", motivo }))}>Enviar rechazo</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button className={btnPrimario} onClick={() => window.confirm("¿Apruebas este presupuesto? Se habilitará el contrato.") && accion(() => enviarJson(url, "POST", { accion: "aprobar" }))}>
              <CheckCircle2 className="w-4 h-4" /> Aprobar presupuesto
            </button>
            <button className={btnSecundario} onClick={() => setRechazando(true)}>Solicitar ajustes</button>
          </div>
        )
      )}
    </Tarjeta>
  );

  if (!esAdmin) return detalle || <Bloqueado>Nuestro equipo está preparando el presupuesto de este proyecto. Te avisaremos aquí cuando esté listo.</Bloqueado>;
  if (p?.estado === "aprobado") return detalle;

  const total = totalItems(items.filter((i) => i.cantidad > 0 && i.precio >= 0));
  return (
    <div className="flex flex-col gap-4">
      {detalle}
      <Tarjeta>
        <p className="font-ui font-semibold text-[#f0f4ff]">{p ? "Editar y reenviar presupuesto" : "Crear presupuesto"}</p>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_90px_130px_auto] gap-2 items-end">
            <label className="col-span-2 sm:col-span-1 text-xs text-silver/70 flex flex-col gap-1">Concepto
              <Input value={it.concepto} maxLength={200} onChange={(e) => setItem(i, "concepto", e.target.value)} placeholder="Ej. Desarrollo del módulo de ventas" />
            </label>
            <label className="text-xs text-silver/70 flex flex-col gap-1">Cantidad
              <Input type="number" min={1} step="any" value={it.cantidad} onChange={(e) => setItem(i, "cantidad", e.target.value)} />
            </label>
            <label className="text-xs text-silver/70 flex flex-col gap-1">Precio (USD)
              <Input type="number" min={0} step="0.01" value={it.precio} onChange={(e) => setItem(i, "precio", e.target.value)} />
            </label>
            <button type="button" aria-label="Quitar concepto" disabled={items.length === 1}
              onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
              className="col-span-2 sm:col-span-1 h-10 px-3 rounded-lg border border-glass-bd text-silver hover:text-red-400 disabled:opacity-40 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" className={cn(btnSecundario, "self-start")} onClick={() => setItems((xs) => [...xs, { concepto: "", cantidad: 1, precio: 0 }])}>
          <Plus className="w-4 h-4" /> Agregar concepto
        </button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-silver/70 flex flex-col gap-1">Notas para el cliente (alcance, forma de pago…)
            <textarea rows={3} className={area} value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={2000} />
          </label>
          <label className="text-xs text-silver/70 flex flex-col gap-1">Válido hasta
            <Input type="date" value={valido} onChange={(e) => setValido(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-glass-bd pt-3">
          <span className="text-sm text-silver">Total: <strong className="font-mono text-[#f0f4ff]">{usd(total)}</strong></span>
          <button className={btnPrimario} onClick={() => accion(() => enviarJson(`/api/proyectos/${d.proyecto.id}/presupuesto`, "PUT", { items, notas, valido_hasta: valido || null }))}>
            Enviar al cliente
          </button>
        </div>
      </Tarjeta>
    </div>
  );
}

/* ── Contrato ── */
function Paso({ n, titulo, hecho, activo, children }: { n: number; titulo: string; hecho: boolean; activo: boolean; children?: React.ReactNode }) {
  return (
    <li className={cn("rounded-xl border p-4 flex flex-col gap-3", activo ? "border-blue-accent/60 bg-blue-accent/5" : "border-glass-bd")}>
      <p className="flex items-center gap-3 text-sm font-ui font-semibold text-[#f0f4ff]">
        <span className={cn("w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs", hecho ? "bg-status-green/20 text-status-green" : activo ? "bg-blue-accent/30 text-white" : "bg-white/5 text-silver/60")}>
          {hecho ? <CheckCircle2 className="w-4 h-4" /> : n}
        </span>
        {titulo}
      </p>
      {activo && children}
    </li>
  );
}

function ArchivoPdf({ onFile, label }: { onFile: (f: File) => void; label: string }) {
  return (
    <label className={cn(btnPrimario, "cursor-pointer self-start")}>
      <Upload className="w-4 h-4" /> {label}
      <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
    </label>
  );
}

function ContratoTab({ d, esAdmin, accion }: { d: Datos; esAdmin: boolean; accion: (fn: () => Promise<void>) => Promise<void> }) {
  const [acepto, setAcepto] = useState(false);
  const [obs, setObs] = useState("");
  if (d.presupuesto?.estado !== "aprobado")
    return <Bloqueado>El contrato se habilita cuando {esAdmin ? "el cliente apruebe" : "apruebes"} el presupuesto.</Bloqueado>;

  const c = d.contrato;
  const base = `/api/proyectos/${d.proyecto.id}/contrato`;
  const ver = <a href={base} target="_blank" rel="noopener noreferrer" className={cn(btnSecundario, "self-start")}><Eye className="w-4 h-4" /> Ver contrato</a>;

  if (esAdmin) return (
    <Tarjeta>
      <p className="font-ui font-semibold text-[#f0f4ff] flex items-center gap-2"><FileSignature className="w-4 h-4 text-cyan" /> Contrato</p>
      {c ? <p className="text-sm text-silver">Estado: <strong className="text-[#f0f4ff]">{CONTRATO_LABEL[c.estado]}</strong> · actualizado el {fechaHora(c.updated_at)}</p>
         : <p className="text-sm text-silver">Sube el contrato en PDF para que el cliente lo apruebe, lo descargue y lo devuelva firmado.</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        {c && ver}
        {c?.tieneFirmado && <a href={`${base}?archivo=firmado`} target="_blank" rel="noopener noreferrer" className={cn(btnSecundario, "self-start")}><Eye className="w-4 h-4" /> Ver copia firmada</a>}
        {c?.estado !== "verificado" && <ArchivoPdf label={c ? "Reemplazar contrato" : "Subir contrato (PDF)"} onFile={(f) => accion(() => subirPdf(base, f))} />}
      </div>
      {c?.estado === "firmado" && (
        <div className="flex flex-col gap-2 border-t border-glass-bd pt-4">
          <p className="text-sm text-[#f0f4ff]">Revisa la copia firmada:</p>
          <textarea rows={2} className={area} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Si hay que corregir algo, indícalo aquí (falta una firma, página incompleta…)" maxLength={500} />
          <div className="flex flex-col sm:flex-row gap-2">
            <button className={btnPrimario} onClick={() => accion(() => enviarJson(base, "PATCH", { accion: "verificar" }))}><CheckCircle2 className="w-4 h-4" /> Verificar firma</button>
            <button className={cn(btn, "border border-red-400/40 text-red-400")} onClick={() => accion(() => enviarJson(base, "PATCH", { accion: "rechazar_firma", observacion: obs }))}>Pedir que lo suba de nuevo</button>
          </div>
        </div>
      )}
    </Tarjeta>
  );

  if (!c) return <Bloqueado>Estamos preparando tu contrato. Aparecerá aquí en cuanto esté listo.</Bloqueado>;
  const orden = ["pendiente_aprobacion", "aprobado", "descargado", "firmado", "verificado"];
  const paso = c.estado === "firma_rechazada" ? 3 : orden.indexOf(c.estado) + 1; // 1 aprobar · 2 descargar · 3 subir · 4+ listo
  return (
    <Tarjeta>
      <p className="font-ui font-semibold text-[#f0f4ff] flex items-center gap-2"><FileSignature className="w-4 h-4 text-cyan" /> Contrato del proyecto</p>
      {c.estado === "firma_rechazada" && c.observacion && <Aviso>Debes subir de nuevo el contrato firmado: {c.observacion}</Aviso>}
      <ol className="flex flex-col gap-3">
        <Paso n={1} titulo="Lee y aprueba el contrato" hecho={paso > 1} activo={paso === 1}>
          {ver}
          <label className="flex items-start gap-3 text-sm text-silver cursor-pointer">
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#4d7fff]" />
            He leído el contrato y estoy de acuerdo con sus términos.
          </label>
          <button disabled={!acepto} className={cn(btnPrimario, "self-start")} onClick={() => accion(() => enviarJson(base, "PATCH", { accion: "aprobar" }))}>Aprobar contrato</button>
        </Paso>
        <Paso n={2} titulo="Descárgalo para firmarlo" hecho={paso > 2} activo={paso === 2}>
          <p className="text-xs text-silver/70">Imprímelo y fírmalo, o fírmalo digitalmente.</p>
          <a href={`${base}?descargar=1`} className={cn(btnPrimario, "self-start")} onClick={() => setTimeout(() => accion(async () => {}), 1500)}>
            <Download className="w-4 h-4" /> Descargar contrato
          </a>
        </Paso>
        <Paso n={3} titulo="Sube el contrato firmado" hecho={paso > 3} activo={paso === 3}>
          <p className="text-xs text-silver/70">Escanéalo o expórtalo en PDF (máx. 4 MB).</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a href={`${base}?descargar=1`} className={cn(btnSecundario, "self-start")}><Download className="w-4 h-4" /> Descargar otra vez</a>
            <ArchivoPdf label="Subir contrato firmado" onFile={(f) => accion(() => subirPdf(base, f))} />
          </div>
        </Paso>
      </ol>
      {c.estado === "firmado" && <Aviso ok>Recibimos tu contrato firmado. Nuestro equipo lo está verificando.</Aviso>}
      {c.estado === "verificado" && <Aviso ok>Contrato firmado y verificado el {fecha(c.verificado_at)}. ¡Tu proyecto está contratado!</Aviso>}
    </Tarjeta>
  );
}

/* ── Cierre: reunión final + encuesta obligatoria ── */
function CierreTab({ d, esAdmin, accion }: { d: Datos; esAdmin: boolean; accion: (fn: () => Promise<void>) => Promise<void> }) {
  const [r, setR] = useState<Record<string, number>>({});
  const [recomendaria, setRecomendaria] = useState<boolean | null>(null);
  const [comentario, setComentario] = useState("");
  const [publicar, setPublicar] = useState(true);
  const [resena, setResena] = useState("");
  const [empresa, setEmpresa] = useState("");
  const e = d.encuesta;

  const resultado = e && (
    <Tarjeta>
      <p className="font-ui font-semibold text-[#f0f4ff] flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-status-green" /> Encuesta respondida el {fecha(e.created_at)}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PREGUNTAS_ENCUESTA.map((q) => (
          <li key={q.id} className="flex items-center justify-between gap-3 text-sm text-silver">{q.label}<Estrellas valor={e[q.id]} /></li>
        ))}
      </ul>
      <p className="text-sm text-silver">¿Nos recomendaría?: <strong className="text-[#f0f4ff]">{e.recomendaria ? "Sí" : "No"}</strong></p>
      {e.comentario && <p className="text-sm text-silver whitespace-pre-line">“{e.comentario}”</p>}
    </Tarjeta>
  );

  if (esAdmin) return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <p className="font-ui font-semibold text-[#f0f4ff]">Reunión final</p>
        {d.proyecto.reunion_final_at
          ? <p className="text-sm text-silver">Realizada el {fechaHora(d.proyecto.reunion_final_at)}. {e ? "El cliente ya respondió la encuesta: puedes marcar el proyecto como culminado." : "Esperando que el cliente responda la encuesta; hasta entonces no se puede entregar el proyecto."}</p>
          : <>
              <p className="text-sm text-silver">Cuando presentes el resultado final al cliente, regístralo aquí. Eso habilita su encuesta de servicio, obligatoria antes de la entrega.</p>
              <button className={cn(btnPrimario, "self-start")} onClick={() => window.confirm("¿Confirmas que la reunión final ya se realizó?") &&
                accion(() => enviarJson(`/api/proyectos/${d.proyecto.id}`, "PATCH", { reunion_final_at: new Date().toISOString() }))}>
                Registrar reunión final
              </button>
            </>}
      </Tarjeta>
      {resultado}
    </div>
  );

  if (!d.proyecto.reunion_final_at) return <Bloqueado>La encuesta de servicio se habilita después de la reunión final, donde te presentaremos el proyecto terminado.</Bloqueado>;
  if (e) return <div className="flex flex-col gap-4"><Aviso ok>¡Gracias por tu opinión! Ya puedes recibir la entrega de tu proyecto.</Aviso>{resultado}</div>;

  const completa = PREGUNTAS_ENCUESTA.every((q) => r[q.id]) && recomendaria !== null && (!publicar || resena.trim().length >= 10);
  return (
    <Tarjeta>
      <div>
        <p className="font-ui font-semibold text-[#f0f4ff]">Encuesta de servicio</p>
        <p className="text-sm text-silver mt-1">Es obligatoria para recibir la entrega del proyecto. Te toma menos de un minuto.</p>
      </div>
      <ul className="flex flex-col gap-4">
        {PREGUNTAS_ENCUESTA.map((q) => (
          <li key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-sm text-[#f0f4ff]">{q.label} <span className="text-red-400">*</span></span>
            <Estrellas valor={r[q.id] ?? 0} size="lg" label={q.label} onChange={(v) => setR((x) => ({ ...x, [q.id]: v }))} />
          </li>
        ))}
      </ul>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-sm text-[#f0f4ff]">¿Recomendarías Technosoftware? <span className="text-red-400">*</span></span>
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" onClick={() => setRecomendaria(v)} aria-pressed={recomendaria === v}
              className={cn("px-5 py-2 rounded-lg border text-sm font-ui", recomendaria === v ? "border-blue-accent bg-blue-accent/20 text-white" : "border-glass-bd text-silver")}>{v ? "Sí" : "No"}</button>
          ))}
        </div>
      </div>
      <label className="text-xs text-silver/70 flex flex-col gap-1">Comentarios para el equipo (privado, opcional)
        <textarea rows={2} className={area} value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={2000} />
      </label>
      <label className="flex items-start gap-3 text-sm text-silver cursor-pointer">
        <input type="checkbox" checked={publicar} onChange={(e) => setPublicar(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#4d7fff]" />
        Quiero dejar una reseña pública (se mostrará en la web y en la app con tu nombre).
      </label>
      {publicar && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="sm:col-span-2 text-xs text-silver/70 flex flex-col gap-1">Tu reseña *
            <textarea rows={3} className={area} value={resena} onChange={(e) => setResena(e.target.value)} maxLength={1000} placeholder="¿Cómo fue tu experiencia trabajando con nosotros?" />
          </label>
          <label className="text-xs text-silver/70 flex flex-col gap-1">Empresa (opcional)
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={120} />
          </label>
        </div>
      )}
      <button disabled={!completa} className={cn(btnPrimario, "self-stretch sm:self-start")}
        onClick={() => accion(() => enviarJson(`/api/proyectos/${d.proyecto.id}/encuesta`, "POST", {
          ...r, recomendaria, comentario, resena: publicar ? { texto: resena, empresa } : null,
        }))}>
        Enviar encuesta
      </button>
    </Tarjeta>
  );
}

export default function ContratacionPanel() {
  const { isAdmin } = useAuth(false);
  const [proyectos, setProyectos] = useState<Proy[] | null>(null);
  const [sel, setSel] = useState("");
  const [tab, setTab] = useState<Tab>("presupuesto");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    (async () => {
      const ps: Proy[] = [];
      for (let p = 0; ; p++) {
        const r = await fetch(`/api/proyectos?pagina=${p}`);
        const j = await r.json(); if (!r.ok) throw new Error(j.error);
        ps.push(...j.proyectos.filter((x: Proy) => x.estado !== "cancelado"));
        if (!j.hayMas) break;
      }
      setProyectos(ps); if (ps.length) setSel(ps[0].id);
    })().catch((e) => setError(e.message || "No se pudieron cargar los proyectos"));
  }, []);

  const cargar = useCallback(() => {
    if (!sel) return;
    setDatos(null);
    fetch(`/api/proyectos/${sel}/contratacion`).then(async (r) => {
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setDatos(j);
    }).catch((e) => setError(e.message));
  }, [sel]);
  useEffect(cargar, [cargar, version]);

  async function accion(fn: () => Promise<void>) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, t: "Listo." }); }
    catch (e) { setMsg({ ok: false, t: (e as Error).message }); }
    finally { setBusy(false); setVersion((v) => v + 1); }
  }

  const habil: Record<Tab, boolean> = {
    presupuesto: true,
    contrato: datos?.presupuesto?.estado === "aprobado",
    cierre: !!datos?.proyecto.reunion_final_at || isAdmin,
  };
  const TABS: [Tab, string][] = [["presupuesto", "Presupuesto"], ["contrato", "Contrato"], ["cierre", isAdmin ? "Cierre y encuesta" : "Encuesta"]];

  return (
    <PanelShell title="Presupuesto y Contrato" subtitle="Aprueba el presupuesto, firma tu contrato y, al cierre, cuéntanos cómo te fue.">
      <Estado loading={!proyectos && !error} error={error} vacio={proyectos?.length === 0} onRetry={() => location.reload()}
        mensajeVacio="Aún no tienes proyectos. Cuando aprobemos tu solicitud de «Nuevo Proyecto», aquí verás su presupuesto y contrato." />
      {!!proyectos?.length && (
        <>
          <label className="text-xs text-silver/70 flex flex-col gap-1 max-w-xl">Proyecto
            <select value={sel} onChange={(e) => { setSel(e.target.value); setTab("presupuesto"); setMsg(null); }}
              className="w-full rounded-lg border border-glass-bd bg-navy-deep/60 px-3 py-2.5 text-sm text-[#f0f4ff]">
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{isAdmin && p.cliente ? ` · ${p.cliente.full_name || p.cliente.email}` : ""}</option>)}
            </select>
          </label>

          {datos && (
            <>
              <div className="flex items-center gap-2 text-sm text-silver">Estado del proyecto: <EstadoBadge estado={datos.proyecto.estado} /></div>
              <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-xl border border-glass-bd" style={cardStyle}>
                {TABS.map(([id, label]) => (
                  <button key={id} role="tab" aria-selected={tab === id} disabled={!habil[id]} onClick={() => setTab(id)}
                    className={cn("flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs sm:text-sm font-ui transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                      tab === id ? "bg-gradient-cta text-white" : "text-silver hover:text-white")}>
                    {!habil[id] && <Lock className="w-3 h-3" />} {label}
                  </button>
                ))}
              </div>
              {msg && <Aviso ok={msg.ok}>{msg.t}</Aviso>}
              <div className={cn(busy && "opacity-60 pointer-events-none")}>
                {tab === "presupuesto" && <PresupuestoTab key={`p${version}`} d={datos} esAdmin={isAdmin} accion={accion} />}
                {tab === "contrato" && <ContratoTab d={datos} esAdmin={isAdmin} accion={accion} />}
                {tab === "cierre" && <CierreTab d={datos} esAdmin={isAdmin} accion={accion} />}
              </div>
            </>
          )}
          {!datos && !error && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-blue-accent animate-spin" /></div>}
        </>
      )}
    </PanelShell>
  );
}
