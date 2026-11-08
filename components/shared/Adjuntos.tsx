"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, useGestion, useLista } from "@/components/management/contexto";
import { fmtFecha } from "@/components/management/ui";

type Archivo = { id: string; nombre: string; tamano: number; created_at: string; autor: { nombre: string; apellido: string } | null };

/** Archivos de cualquier entidad (bucket privado "gestion", descarga con URL firmada). */
export function Adjuntos({ entidad, entidadId }: { entidad: string; entidadId: string }) {
  const { intentar } = useGestion();
  const { datos, recargar } = useLista<Archivo>("archivos_gestion", { "f.entidad": entidad, "f.entidad_id": entidadId, size: 50 });
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function subir(f: File) {
    setSubiendo(true);
    const fd = new FormData();
    fd.set("entidad", entidad); fd.set("entidad_id", entidadId); fd.set("archivo", f);
    await intentar(() => api("/api/gestion/archivos", { method: "POST", body: fd }), "Archivo adjuntado");
    setSubiendo(false);
    recargar();
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {datos.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm rounded-lg border border-glass-bd px-2 py-1.5">
            <Paperclip className="w-3.5 h-3.5 text-silver shrink-0" />
            <span className="flex-1 truncate">{a.nombre}</span>
            <span className="text-[11px] text-silver/60 hidden sm:inline" translate="no">{(a.tamano / 1024).toFixed(0)} KB · {fmtFecha(a.created_at)}</span>
            <button className="p-1 text-silver hover:text-white" aria-label={`Descargar ${a.nombre}`}
              onClick={() => intentar(() => api<{ url: string }>(`/api/gestion/archivos/${a.id}`)).then((r) => r && window.open(r.url, "_blank", "noopener"))}>
              <Download className="w-4 h-4" />
            </button>
            <button className="p-1 text-red-300/80 hover:text-red-300" aria-label={`Eliminar ${a.nombre}`}
              onClick={async () => { if (await intentar(() => api(`/api/gestion/archivos/${a.id}`, { method: "DELETE" }), "Archivo eliminado")) recargar(); }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {!datos.length && <li className="text-xs text-silver/60">Sin archivos.</li>}
      </ul>
      <input ref={input} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }} />
      <Button variant="outline" size="sm" disabled={subiendo} onClick={() => input.current?.click()}>
        {subiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}Adjuntar (máx. 4 MB)
      </Button>
    </div>
  );
}
