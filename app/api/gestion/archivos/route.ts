import { randomUUID } from "node:crypto";
import { json } from "@/lib/api";
import { MAX_ARCHIVO, sniff, nombreSeguro } from "@/lib/archivos";
import { mensajeError } from "@/lib/services/recursos";
import { requireStaff, esUuid } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/server";

const ENTIDADES = ["tarea", "proyecto", "ticket", "oportunidad", "contacto", "factura", "empleado"];

// POST /api/gestion/archivos (multipart: entidad, entidad_id, archivo)
// El tipo se valida por firma (magic bytes). El registro se inserta con la sesión del usuario,
// así RLS comprueba que puede ver la entidad; si falla, se borra el objeto subido.
export async function POST(req: Request) {
  const auth = await requireStaff();
  if ("error" in auth) return auth.error;
  const form = await req.formData().catch(() => null);
  const entidad = String(form?.get("entidad") ?? "");
  const entidadId = String(form?.get("entidad_id") ?? "");
  const archivo = form?.get("archivo");
  if (!ENTIDADES.includes(entidad) || !esUuid(entidadId)) return json({ error: "Destino inválido" }, 400);
  if (!(archivo instanceof File) || archivo.size === 0) return json({ error: "Adjunta un archivo" }, 400);
  if (archivo.size > MAX_ARCHIVO) return json({ error: `Máximo ${MAX_ARCHIVO / 1024 / 1024} MB por archivo` }, 413);

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const tipo = sniff(bytes, archivo.name);
  if (!tipo) return json({ error: "Tipo de archivo no permitido (PDF, imágenes u Office)" }, 415);

  const nombre = nombreSeguro(archivo.name, tipo.ext);
  const ruta = `${entidad}/${entidadId}/${randomUUID()}.${tipo.ext}`;
  const admin = createAdminClient();
  const up = await admin.storage.from("gestion").upload(ruta, bytes, { contentType: tipo.mime, upsert: false });
  if (up.error) return json({ error: "No se pudo guardar el archivo" }, 500);

  const { data, error } = await auth.db.from("archivos_gestion").insert({
    entidad, entidad_id: entidadId, nombre, ruta, mime: tipo.mime, tamano: archivo.size, subido_por: auth.ctx.empleado_id,
  }).select("id, nombre, mime, tamano, created_at").single();
  if (error) {
    await admin.storage.from("gestion").remove([ruta]);
    const [m, s] = mensajeError(error); return json({ error: m }, s);
  }
  return json({ dato: data }, 201);
}
