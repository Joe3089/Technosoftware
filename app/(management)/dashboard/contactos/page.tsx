"use client";

import { useGestion } from "@/components/management/contexto";
import { RecursoTabla, type Fila } from "@/components/management/RecursoTabla";
import type { Campo } from "@/components/management/Formulario";
import { TIPOS_CONTACTO, etiqueta } from "@/lib/services/constantes";
import { etqCliente } from "@/components/management/proyectos/campos";

const CAMPOS_CONTACTO: Campo[] = [
  { nombre: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true },
  { nombre: "apellido", etiqueta: "Apellido", tipo: "texto" },
  { nombre: "empresa", etiqueta: "Empresa", tipo: "texto" },
  { nombre: "cargo", etiqueta: "Cargo", tipo: "texto" },
  { nombre: "email", etiqueta: "Correo", tipo: "email" },
  { nombre: "telefono", etiqueta: "Teléfono", tipo: "texto" },
  { nombre: "whatsapp", etiqueta: "WhatsApp", tipo: "texto", ayuda: "Con código de país, p. ej. +58 412…" },
  { nombre: "pais", etiqueta: "País", tipo: "texto" },
  { nombre: "direccion", etiqueta: "Dirección", tipo: "texto", completo: true },
  { nombre: "tipo", etiqueta: "Tipo", tipo: "opciones", opciones: TIPOS_CONTACTO, requerido: true },
  { nombre: "cliente_id", etiqueta: "Cliente relacionado", tipo: "ref", recurso: "clientes", refEtiqueta: etqCliente, refInicial: (f) => (f.cliente as { nombre?: string } | null)?.nombre },
  { nombre: "observaciones", etiqueta: "Observaciones", tipo: "textarea" },
];

const wa = (n: unknown) => (typeof n === "string" && n ? `https://wa.me/${n.replace(/\D/g, "")}` : null);

export default function PaginaContactos() {
  const { puede } = useGestion();
  const gestiona = puede("contactos.gestionar");
  return (
    <div className="space-y-4">
      <h1 className="font-ui font-bold text-xl">Contactos</h1>
      <p className="text-sm text-silver -mt-2">Directorio único de clientes, prospectos, proveedores y socios. El correo y el WhatsApp no se pueden repetir.</p>
      <RecursoTabla recurso="contactos" campos={CAMPOS_CONTACTO} textoNuevo="Nuevo contacto" puedeCrear={gestiona} puedeEditar={gestiona} puedeBorrar={gestiona}
        nuevoInicial={{ tipo: "contacto" }} filtros={[{ clave: "tipo", etiqueta: "Tipo", opciones: TIPOS_CONTACTO }]}
        columnas={[
          { clave: "nombre", titulo: "Nombre", orden: "nombre", render: (f: Fila) => <span className="font-medium">{`${f.nombre} ${f.apellido ?? ""}`}</span> },
          { clave: "empresa", titulo: "Empresa", orden: "empresa", render: (f) => `${f.empresa ?? "—"}${f.cargo ? ` · ${f.cargo}` : ""}` },
          { clave: "tipo", titulo: "Tipo", orden: "tipo", render: (f) => etiqueta(TIPOS_CONTACTO, f.tipo as string) },
          { clave: "email", titulo: "Correo", render: (f) => (f.email ? <a href={`mailto:${f.email}`} className="text-blue-accent hover:underline" onClick={(e) => e.stopPropagation()}>{String(f.email)}</a> : "—") },
          { clave: "telefono", titulo: "Teléfono / WhatsApp", render: (f) => (
            <span className="flex flex-col">
              {f.telefono ? <span translate="no">{String(f.telefono)}</span> : null}
              {wa(f.whatsapp) ? <a href={wa(f.whatsapp)!} target="_blank" rel="noopener noreferrer" className="text-status-green text-xs hover:underline" translate="no">WhatsApp {String(f.whatsapp)}</a> : null}
              {!f.telefono && !f.whatsapp && "—"}
            </span>
          ) },
          { clave: "pais", titulo: "País" },
        ]} />
    </div>
  );
}
