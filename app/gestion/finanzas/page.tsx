"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban, HandCoins, Info, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, useGestion } from "@/components/gestion/contexto";
import { Formulario, type Campo } from "@/components/gestion/Formulario";
import { RecursoTabla, type Fila } from "@/components/gestion/RecursoTabla";
import { Cargando, Chip, Confirmar, ErrorCaja, Etiqueta, Indicador, Modal, Tarjeta, campoCls, fmtFecha, fmtMonto, hoy } from "@/components/gestion/ui";
import { etqDepto } from "@/components/gestion/actividades/comun";
import { etqCliente } from "@/components/gestion/proyectos/campos";
import { ESTADOS_FACTURA, MONEDAS, color, etiqueta } from "@/lib/gestion/constantes";

const PESTANAS = { resumen: "Resumen", facturas: "Facturas", registros: "Ingresos y gastos", presupuestos: "Presupuestos", billetera: "Billetera de clientes" };
const etqProy = (f: Record<string, unknown>) => `${f.codigo} · ${f.nombre}`;
const etqProv = (f: Record<string, unknown>) => `${f.empresa ?? `${f.nombre} ${f.apellido ?? ""}`}`;

const CAMPOS_FACTURA: Campo[] = [
  { nombre: "tipo", etiqueta: "Tipo", tipo: "opciones", opciones: [{ valor: "emitida", etiqueta: "Emitida (por cobrar)" }, { valor: "recibida", etiqueta: "Recibida (por pagar)" }], requerido: true, soloCrear: true },
  { nombre: "numero", etiqueta: "Número", tipo: "texto", requerido: true },
  { nombre: "cliente_id", etiqueta: "Cliente", tipo: "ref", recurso: "clientes", refEtiqueta: etqCliente, visible: (v) => v.tipo === "emitida", refInicial: (f) => (f.cliente as { nombre?: string } | null)?.nombre },
  { nombre: "contacto_id", etiqueta: "Proveedor / contacto", tipo: "ref", recurso: "contactos", refEtiqueta: etqProv, refInicial: (f) => (f.contacto ? etqProv(f.contacto as Record<string, unknown>) : null) },
  { nombre: "proyecto_id", etiqueta: "Proyecto", tipo: "ref", recurso: "proyectos", refEtiqueta: etqProy, refInicial: (f) => (f.proyecto ? etqProy(f.proyecto as Record<string, unknown>) : null) },
  { nombre: "fecha_emision", etiqueta: "Emisión", tipo: "fecha", requerido: true },
  { nombre: "fecha_vencimiento", etiqueta: "Vencimiento", tipo: "fecha" },
  { nombre: "moneda", etiqueta: "Moneda", tipo: "opciones", opciones: MONEDAS, requerido: true },
  { nombre: "subtotal", etiqueta: "Subtotal", tipo: "numero", min: 0, requerido: true },
  { nombre: "impuesto", etiqueta: "Impuesto", tipo: "numero", min: 0 },
  { nombre: "estado", etiqueta: "Estado", tipo: "opciones", opciones: [{ valor: "borrador", etiqueta: "Borrador" }, { valor: "emitida", etiqueta: "Emitida" }], requerido: true, soloCrear: true },
  { nombre: "concepto", etiqueta: "Concepto", tipo: "textarea" },
];

export default function PaginaFinanzas() {
  const { puede } = useGestion();
  const [pestana, setPestana] = useState<keyof typeof PESTANAS>("resumen");
  const gestiona = puede("finanzas.gestionar");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-ui font-bold text-xl">Contabilidad y finanzas</h1>
        <p className="text-xs text-silver flex items-center gap-1.5 mt-1"><Info className="w-3.5 h-3.5" />Contabilidad de gestión. No sustituye la contabilidad fiscal ni aplica reglas tributarias. Los proveedores se registran en <Link href="/gestion/contactos" className="text-blue-accent hover:underline">Contactos</Link> (tipo proveedor).</p>
      </div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-glass-bd">
        {(Object.keys(PESTANAS) as (keyof typeof PESTANAS)[]).map((k) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
            className={cn("px-3 py-2 text-xs font-ui whitespace-nowrap border-b-2 -mb-px", pestana === k ? "border-cyan text-white" : "border-transparent text-silver hover:text-white")}>{PESTANAS[k]}</button>
        ))}
      </div>
      {pestana === "resumen" && <Resumen />}
      {pestana === "facturas" && <Facturas gestiona={gestiona} />}
      {pestana === "registros" && <Registros gestiona={gestiona} />}
      {pestana === "presupuestos" && (
        <RecursoTabla recurso="presupuestos_gestion" puedeCrear={gestiona} puedeEditar={gestiona} textoNuevo="Nuevo presupuesto" buscar={false}
          nuevoInicial={{ moneda: "USD", periodo_inicio: `${hoy().slice(0, 4)}-01-01`, periodo_fin: `${hoy().slice(0, 4)}-12-31` }}
          campos={[{ nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
            { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto, soloCrear: true },
            { nombre: "proyecto_id", etiqueta: "Proyecto", tipo: "ref", recurso: "proyectos", refEtiqueta: etqProy, soloCrear: true },
            { nombre: "categoria", etiqueta: "Categoría de gasto", tipo: "opciones", catalogo: "categoria_gasto" },
            { nombre: "periodo_inicio", etiqueta: "Desde", tipo: "fecha", requerido: true, soloCrear: true },
            { nombre: "periodo_fin", etiqueta: "Hasta", tipo: "fecha", requerido: true, soloCrear: true },
            { nombre: "monto", etiqueta: "Monto", tipo: "numero", min: 0, requerido: true },
            { nombre: "moneda", etiqueta: "Moneda", tipo: "opciones", opciones: MONEDAS, requerido: true, soloCrear: true }]}
          columnas={[{ clave: "nombre", titulo: "Presupuesto" },
            { clave: "alcance", titulo: "Alcance", render: (f) => (f.proyecto as { codigo?: string } | null)?.codigo ?? (f.departamento as { nombre?: string } | null)?.nombre ?? "General" },
            { clave: "categoria", titulo: "Categoría" }, { clave: "periodo", titulo: "Período", render: (f) => `${fmtFecha(f.periodo_inicio as string)} – ${fmtFecha(f.periodo_fin as string)}` },
            { clave: "monto", titulo: "Monto", render: (f) => fmtMonto(f.monto as number, f.moneda as string) }]} />
      )}
      {pestana === "billetera" && (
        <div className="space-y-2">
          <p className="text-xs text-silver">Ledger de la billetera de clientes (solo lectura). Los abonos los acredita el sistema de pagos; aquí no se modifican.</p>
          <RecursoTabla recurso="movimientos" buscar={false} filtros={[{ clave: "tipo", etiqueta: "Tipo", opciones: ["abono", "asignacion", "consumo", "reembolso"].map((v) => ({ valor: v, etiqueta: v })) }]}
            columnas={[{ clave: "created_at", titulo: "Fecha", render: (f) => fmtFecha(f.created_at as string) }, { clave: "tipo", titulo: "Tipo" },
              { clave: "monto", titulo: "Monto", render: (f) => fmtMonto(f.monto as number) }, { clave: "metodo", titulo: "Método" },
              { clave: "referencia", titulo: "Referencia" }, { clave: "descripcion", titulo: "Descripción" }]} />
        </div>
      )}
    </div>
  );
}

type Reporte = {
  totales: { ingresos: number; gastos: number }; cartera: { cobrar: number; cobrarVencido: number; pagar: number; pagarVencido: number };
  meses: { mes: string; ingresos: number; gastos: number }[]; categorias: { categoria: string; monto: number }[];
  rentabilidad: { id: string; codigo: string; nombre: string; presupuesto: number | null; ingresos: number; gastos: number; margen: number | null }[];
};
function Resumen() {
  const [desde, setDesde] = useState(`${hoy().slice(0, 4)}-01-01`);
  const [hasta, setHasta] = useState(hoy());
  const [r, setR] = useState<Reporte | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setR(null); api<Reporte>(`/api/gestion/finanzas/reporte?desde=${desde}&hasta=${hasta}`).then(setR).catch((e) => setError(e.message)); }, [desde, hasta]);
  if (error) return <ErrorCaja texto={error} />;
  const max = Math.max(1, ...(r?.meses ?? []).flatMap((m) => [m.ingresos, m.gastos]));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <Etiqueta texto="Desde"><input type="date" className={campoCls} value={desde} onChange={(e) => setDesde(e.target.value)} /></Etiqueta>
        <Etiqueta texto="Hasta"><input type="date" className={campoCls} value={hasta} onChange={(e) => setHasta(e.target.value)} /></Etiqueta>
      </div>
      {!r ? <Cargando /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Indicador titulo="Ingresos" valor={fmtMonto(r.totales.ingresos)} color="#00e676" />
            <Indicador titulo="Gastos" valor={fmtMonto(r.totales.gastos)} color="#ff5370" />
            <Indicador titulo="Flujo de caja" valor={fmtMonto(r.totales.ingresos - r.totales.gastos)} color="#00cfff" />
            <Indicador titulo="Margen" valor={r.totales.ingresos ? `${(((r.totales.ingresos - r.totales.gastos) / r.totales.ingresos) * 100).toFixed(1)}%` : "—"} />
            <Indicador titulo="Cuentas por cobrar" valor={fmtMonto(r.cartera.cobrar)} detalle={`Vencido: ${fmtMonto(r.cartera.cobrarVencido)}`} color="#4d7fff" />
            <Indicador titulo="Cuentas por pagar" valor={fmtMonto(r.cartera.pagar)} detalle={`Vencido: ${fmtMonto(r.cartera.pagarVencido)}`} color="#ffb300" />
          </div>
          <Tarjeta titulo="Ingresos y gastos por mes">
            {!r.meses.length ? <p className="text-xs text-silver/60">Sin movimientos en el período.</p> : (
              <div className="flex items-end gap-3 h-48 overflow-x-auto pb-1" role="img" aria-label="Gráfico de ingresos y gastos por mes">
                {r.meses.map((m) => (
                  <div key={m.mes} className="flex flex-col items-center gap-1 min-w-[44px] h-full justify-end">
                    <div className="flex items-end gap-1 flex-1">
                      <div className="w-4 bg-status-green/80 rounded-t" style={{ height: `${(m.ingresos / max) * 100}%` }} title={`Ingresos ${fmtMonto(m.ingresos)}`} />
                      <div className="w-4 bg-red-400/80 rounded-t" style={{ height: `${(m.gastos / max) * 100}%` }} title={`Gastos ${fmtMonto(m.gastos)}`} />
                    </div>
                    <span className="text-[10px] text-silver" translate="no">{m.mes.slice(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>
          <div className="grid lg:grid-cols-2 gap-4">
            <Tarjeta titulo="Gasto por categoría">
              <ul className="space-y-2">
                {r.categorias.map((c) => (
                  <li key={c.categoria} className="text-sm">
                    <div className="flex justify-between text-xs mb-1"><span>{c.categoria}</span><span translate="no">{fmtMonto(c.monto)}</span></div>
                    <div className="h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-red-400/70" style={{ width: `${(c.monto / Math.max(1, r.categorias[0].monto)) * 100}%` }} /></div>
                  </li>
                ))}
                {!r.categorias.length && <li className="text-xs text-silver/60">Sin gastos registrados.</li>}
              </ul>
            </Tarjeta>
            <Tarjeta titulo="Rentabilidad por proyecto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-silver"><tr><th className="text-left py-1">Proyecto</th><th className="text-right">Ingresos</th><th className="text-right">Costos</th><th className="text-right">Margen</th></tr></thead>
                  <tbody translate="no">
                    {r.rentabilidad.map((p) => (
                      <tr key={p.id} className="border-t border-glass-bd/50">
                        <td className="py-1.5"><Link href={`/gestion/proyectos/${p.id}`} className="hover:text-cyan">{p.codigo} · {p.nombre}</Link></td>
                        <td className="text-right">{fmtMonto(p.ingresos)}</td><td className="text-right">{fmtMonto(p.gastos)}</td>
                        <td className={cn("text-right", (p.margen ?? 0) < 0 && "text-red-300")}>{p.margen == null ? "—" : `${p.margen}%`}</td>
                      </tr>
                    ))}
                    {!r.rentabilidad.length && <tr><td colSpan={4} className="text-xs text-silver/60 py-2">Sin movimientos asociados a proyectos.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          </div>
        </>
      )}
    </div>
  );
}

function Facturas({ gestiona }: { gestiona: boolean }) {
  const { intentar } = useGestion();
  const [pago, setPago] = useState<Fila | null>(null);
  const [anular, setAnular] = useState<{ f: Fila; recargar: () => void } | null>(null);
  const [recargarPago, setRecargarPago] = useState<() => void>(() => () => undefined);
  return (
    <>
      <RecursoTabla recurso="facturas" campos={CAMPOS_FACTURA} puedeCrear={gestiona} puedeEditar={(f) => gestiona && f.estado === "borrador"}
        puedeBorrar={(f) => gestiona && f.estado === "borrador"} descripcionBorrar="El borrador se eliminará." textoNuevo="Nueva factura"
        nuevoInicial={{ tipo: "emitida", moneda: "USD", estado: "emitida", fecha_emision: hoy(), impuesto: 0 }}
        filtros={[{ clave: "tipo", etiqueta: "Tipo", opciones: [{ valor: "emitida", etiqueta: "Por cobrar" }, { valor: "recibida", etiqueta: "Por pagar" }] },
          { clave: "estado", etiqueta: "Estado", opciones: ESTADOS_FACTURA }]}
        acciones={(f, recargar) => gestiona && (
          <>
            {f.estado === "borrador" && <Button variant="link" size="sm" title="Emitir" onClick={async () => { if (await intentar(() => api(`/api/gestion/facturas/${f.id}`, { method: "PATCH", json: { estado: "emitida" } }), "Factura emitida")) recargar(); }}><Send className="w-4 h-4" /></Button>}
            {["emitida", "parcial"].includes(f.estado as string) && <Button variant="link" size="sm" title="Registrar pago" onClick={() => { setPago(f); setRecargarPago(() => recargar); }}><HandCoins className="w-4 h-4" /></Button>}
            {f.estado === "emitida" && Number(f.pagado) === 0 && <Button variant="link" size="sm" className="text-red-300" title="Anular" onClick={() => setAnular({ f, recargar })}><Ban className="w-4 h-4" /></Button>}
          </>
        )}
        columnas={[
          { clave: "numero", titulo: "Número", orden: "numero", render: (f) => <span translate="no">{String(f.numero)}</span> },
          { clave: "tipo", titulo: "Tipo", render: (f) => (f.tipo === "emitida" ? "Por cobrar" : "Por pagar") },
          { clave: "tercero", titulo: "Cliente / proveedor", render: (f) => (f.cliente as { nombre?: string } | null)?.nombre ?? (f.contacto ? etqProv(f.contacto as Record<string, unknown>) : "—") },
          { clave: "fecha_emision", titulo: "Emisión", orden: "fecha_emision", render: (f) => fmtFecha(f.fecha_emision as string) },
          { clave: "fecha_vencimiento", titulo: "Vence", orden: "fecha_vencimiento", render: (f) => {
            const v = f.fecha_vencimiento as string | null; const venc = v && v < hoy() && ["emitida", "parcial"].includes(f.estado as string);
            return <span className={venc ? "text-red-300" : ""}>{fmtFecha(v)}</span>;
          } },
          { clave: "total", titulo: "Total", orden: "total", render: (f) => <span translate="no">{fmtMonto(f.total as number, f.moneda as string)}</span> },
          { clave: "saldo", titulo: "Saldo", render: (f) => <span translate="no">{fmtMonto(Number(f.total) - Number(f.pagado), f.moneda as string)}</span> },
          { clave: "estado", titulo: "Estado", render: (f) => <Chip texto={etiqueta(ESTADOS_FACTURA, f.estado as string)} color={color(ESTADOS_FACTURA, f.estado as string)} /> },
        ]} />
      <Modal abierto={!!pago} onCerrar={() => setPago(null)} titulo={`Registrar pago · ${pago?.numero ?? ""}`} descripcion={pago ? `Saldo pendiente: ${fmtMonto(Number(pago.total) - Number(pago.pagado), pago.moneda as string)}. Los pagos son inmutables.` : undefined} ancho="max-w-md">
        {pago && (
          <Formulario textoGuardar="Registrar pago" onCancelar={() => setPago(null)}
            inicial={{ fecha: hoy(), monto: Number(pago.total) - Number(pago.pagado) }}
            campos={[{ nombre: "fecha", etiqueta: "Fecha", tipo: "fecha", requerido: true }, { nombre: "monto", etiqueta: "Monto", tipo: "numero", min: 0.01, requerido: true },
              { nombre: "metodo", etiqueta: "Método", tipo: "texto" }, { nombre: "referencia", etiqueta: "Referencia", tipo: "texto" }]}
            onGuardar={async (d) => { await api("/api/gestion/pagos_factura", { method: "POST", json: { ...d, factura_id: pago.id } }); setPago(null); recargarPago(); }} />
        )}
      </Modal>
      <Confirmar abierto={!!anular} titulo="Anular factura" accion="Anular" texto="La factura quedará anulada de forma permanente y no podrá recibir pagos."
        onCerrar={() => setAnular(null)}
        onConfirmar={async () => { if (await intentar(() => api(`/api/gestion/facturas/${anular!.f.id}`, { method: "PATCH", json: { estado: "anulada" } }), "Factura anulada")) { anular!.recargar(); setAnular(null); } }} />
    </>
  );
}

function Registros({ gestiona }: { gestiona: boolean }) {
  const { intentar } = useGestion();
  const [anular, setAnular] = useState<{ f: Fila; recargar: () => void } | null>(null);
  const [motivo, setMotivo] = useState("");
  return (
    <>
      <RecursoTabla recurso="finanzas_registros" puedeCrear={gestiona} textoNuevo="Nuevo registro"
        nuevoInicial={{ tipo: "gasto", moneda: "USD", fecha: hoy() }}
        filtros={[{ clave: "tipo", etiqueta: "Tipo", opciones: [{ valor: "ingreso", etiqueta: "Ingresos" }, { valor: "gasto", etiqueta: "Gastos" }] },
          { clave: "anulado", etiqueta: "Vigencia", opciones: [{ valor: "false", etiqueta: "Vigentes" }, { valor: "true", etiqueta: "Anulados" }] }]}
        campos={[{ nombre: "tipo", etiqueta: "Tipo", tipo: "opciones", opciones: [{ valor: "ingreso", etiqueta: "Ingreso" }, { valor: "gasto", etiqueta: "Gasto" }], requerido: true },
          { nombre: "categoria", etiqueta: "Categoría (gasto)", tipo: "opciones", catalogo: "categoria_gasto", requerido: true, visible: (v) => v.tipo === "gasto" },
          { nombre: "categoria", etiqueta: "Categoría (ingreso)", tipo: "opciones", catalogo: "categoria_ingreso", requerido: true, visible: (v) => v.tipo === "ingreso" },
          { nombre: "descripcion", etiqueta: "Descripción", tipo: "texto", requerido: true, completo: true },
          { nombre: "monto", etiqueta: "Monto", tipo: "numero", min: 0.01, requerido: true },
          { nombre: "moneda", etiqueta: "Moneda", tipo: "opciones", opciones: MONEDAS, requerido: true },
          { nombre: "fecha", etiqueta: "Fecha", tipo: "fecha", requerido: true },
          { nombre: "proyecto_id", etiqueta: "Proyecto (costo/ingreso del proyecto)", tipo: "ref", recurso: "proyectos", refEtiqueta: etqProy },
          { nombre: "departamento_id", etiqueta: "Departamento", tipo: "ref", recurso: "departamentos", refEtiqueta: etqDepto },
          { nombre: "contacto_id", etiqueta: "Proveedor / contacto", tipo: "ref", recurso: "contactos", refEtiqueta: etqProv }]}
        acciones={(f, recargar) => gestiona && !f.anulado && <Button variant="link" size="sm" className="text-red-300" title="Anular" onClick={() => { setMotivo(""); setAnular({ f, recargar }); }}><Ban className="w-4 h-4" /></Button>}
        columnas={[
          { clave: "fecha", titulo: "Fecha", orden: "fecha", render: (f) => fmtFecha(f.fecha as string) },
          { clave: "tipo", titulo: "Tipo", render: (f) => <Chip texto={f.tipo === "ingreso" ? "Ingreso" : "Gasto"} color={f.tipo === "ingreso" ? "#00e676" : "#ff5370"} /> },
          { clave: "categoria", titulo: "Categoría", orden: "categoria" },
          { clave: "descripcion", titulo: "Descripción", render: (f) => <span className={f.anulado ? "line-through text-silver/60" : ""}>{String(f.descripcion)}</span> },
          { clave: "proyecto", titulo: "Proyecto", render: (f) => (f.proyecto as { codigo?: string } | null)?.codigo ?? "—" },
          { clave: "monto", titulo: "Monto", orden: "monto", render: (f) => <span translate="no">{fmtMonto(f.monto as number, f.moneda as string)}</span> },
        ]} />
      <Modal abierto={!!anular} onCerrar={() => setAnular(null)} titulo="Anular registro" descripcion="Los registros no se editan ni se borran: se anulan con un motivo y quedan en el historial." ancho="max-w-md">
        <div className="space-y-3">
          <Etiqueta texto="Motivo" requerido><input className={campoCls} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Etiqueta>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAnular(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" disabled={!motivo.trim()} onClick={async () => {
              if (await intentar(() => api(`/api/gestion/finanzas_registros/${anular!.f.id}`, { method: "PATCH", json: { anulado: true, motivo_anulacion: motivo.trim() } }), "Registro anulado")) { anular!.recargar(); setAnular(null); }
            }}>Anular</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
