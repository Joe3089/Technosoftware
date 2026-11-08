"use client";

import { useState } from "react";
import { useGestion } from "@/components/management/contexto";
import { RecursoTabla, type Fila } from "@/components/management/RecursoTabla";
import type { Campo } from "@/components/management/Formulario";
import { Chip, Modal, fmtFecha, fmtMonto } from "@/components/management/ui";
import { ESTADOS_FACTURA, ESTADOS_PROYECTO, ESTADOS_TICKET, ETAPAS_CRM, color, etiqueta } from "@/lib/services/constantes";
import { Historial, HistorialModulo } from "@/components/shared/Historial";

const TIPOS = [{ valor: "interesado", etiqueta: "Interesado" }, { valor: "fijo", etiqueta: "Fijo" }];
const CAMPOS: Campo[] = [
  { nombre: "nombre", etiqueta: "Nombre o razón social", tipo: "texto", requerido: true },
  { nombre: "email", etiqueta: "Correo", tipo: "email", requerido: true, soloCrear: true },
  { nombre: "telefono", etiqueta: "Teléfono", tipo: "texto" },
  { nombre: "empresa", etiqueta: "Empresa", tipo: "texto" },
  { nombre: "tipo", etiqueta: "Tipo", tipo: "opciones", opciones: TIPOS, requerido: true },
  { nombre: "servicio", etiqueta: "Servicio de interés", tipo: "texto" },
  { nombre: "notas", etiqueta: "Notas", tipo: "textarea" },
];

/** Reutiliza la tabla existente de clientes (sin duplicar registros) y muestra su expediente comercial. */
export default function PaginaClientes() {
  const { puede } = useGestion();
  const [abierto, setAbierto] = useState<Fila | null>(null);
  const gestiona = puede("clientes.gestionar");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-ui font-bold text-xl">Clientes</h1>
        <HistorialModulo titulo="Clientes" entidades={["clientes"]} />
      </div>
      <RecursoTabla recurso="clientes" campos={CAMPOS} textoNuevo="Nuevo cliente" puedeCrear={gestiona} puedeEditar={gestiona}
        nuevoInicial={{ tipo: "interesado" }} filtros={[{ clave: "tipo", etiqueta: "Tipo", opciones: TIPOS }]} onAbrir={setAbierto}
        columnas={[
          { clave: "nombre", titulo: "Cliente", orden: "nombre", render: (f) => <span className="font-medium">{String(f.nombre)}</span> },
          { clave: "empresa", titulo: "Empresa", orden: "empresa" },
          { clave: "email", titulo: "Correo" },
          { clave: "telefono", titulo: "Teléfono" },
          { clave: "tipo", titulo: "Tipo", render: (f) => <Chip texto={etiqueta(TIPOS, f.tipo as string)} color={f.tipo === "fijo" ? "#00e676" : "#4d7fff"} /> },
          { clave: "created_at", titulo: "Desde", orden: "created_at", render: (f) => fmtFecha(f.created_at as string) },
        ]} />

      <Modal abierto={!!abierto} onCerrar={() => setAbierto(null)} titulo={String(abierto?.nombre ?? "Cliente")} descripcion={String(abierto?.email ?? "")} ancho="max-w-4xl">
        {abierto && (
          <div className="space-y-6">
            {abierto.notas ? <p className="text-sm text-silver whitespace-pre-wrap">{String(abierto.notas)}</p> : null}
            {puede("contactos.ver") && (
              <RecursoTabla recurso="contactos" titulo="Contactos" fijos={{ cliente_id: abierto.id }} buscar={false} size={10}
                columnas={[{ clave: "nombre", titulo: "Nombre", render: (f) => `${f.nombre} ${f.apellido ?? ""}` }, { clave: "cargo", titulo: "Cargo" }, { clave: "email", titulo: "Correo" }, { clave: "telefono", titulo: "Teléfono" }]} />
            )}
            <RecursoTabla recurso="proyectos" titulo="Proyectos" fijos={{ cliente_id: abierto.id }} buscar={false} size={10}
              columnas={[{ clave: "codigo", titulo: "Código" }, { clave: "nombre", titulo: "Proyecto" },
                { clave: "estado", titulo: "Estado", render: (f) => etiqueta(ESTADOS_PROYECTO, f.estado as string) }]} />
            {puede("crm.ver") && (
              <RecursoTabla recurso="oportunidades" titulo="Historial comercial (oportunidades)" fijos={{ cliente_id: abierto.id }} buscar={false} size={10}
                columnas={[{ clave: "titulo", titulo: "Oportunidad" }, { clave: "etapa", titulo: "Etapa", render: (f) => <Chip texto={etiqueta(ETAPAS_CRM, f.etapa as string)} color={color(ETAPAS_CRM, f.etapa as string)} /> },
                  { clave: "valor", titulo: "Valor", render: (f) => fmtMonto(f.valor as number, f.moneda as string) }]} />
            )}
            {puede("finanzas.ver") && (
              <RecursoTabla recurso="facturas" titulo="Facturación y pagos" fijos={{ cliente_id: abierto.id }} buscar={false} size={10}
                columnas={[{ clave: "numero", titulo: "Factura" }, { clave: "fecha_emision", titulo: "Emisión", render: (f) => fmtFecha(f.fecha_emision as string) },
                  { clave: "total", titulo: "Total", render: (f) => fmtMonto(f.total as number, f.moneda as string) },
                  { clave: "pagado", titulo: "Pagado", render: (f) => fmtMonto(f.pagado as number, f.moneda as string) },
                  { clave: "estado", titulo: "Estado", render: (f) => <Chip texto={etiqueta(ESTADOS_FACTURA, f.estado as string)} color={color(ESTADOS_FACTURA, f.estado as string)} /> }]} />
            )}
            <section className="space-y-2"><h2 className="font-ui font-semibold text-[#f0f4ff]">Historial</h2><Historial entidad="clientes" entidadId={abierto.id} /></section>
            <RecursoTabla recurso="tickets" titulo="Incidencias y soporte" fijos={{ cliente_id: abierto.id }} buscar={false} size={10}
              columnas={[{ clave: "numero", titulo: "#" }, { clave: "titulo", titulo: "Asunto" },
                { clave: "estado", titulo: "Estado", render: (f) => <Chip texto={etiqueta(ESTADOS_TICKET, f.estado as string)} color={color(ESTADOS_TICKET, f.estado as string)} /> }]} />
          </div>
        )}
      </Modal>
    </div>
  );
}
