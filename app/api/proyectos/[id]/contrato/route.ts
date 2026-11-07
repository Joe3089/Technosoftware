import { NextResponse } from "next/server";
import { requireRole, json, str } from "@/lib/api";
import { registrarActividad } from "@/lib/actividad";
import { MAX_ARCHIVO, sniff } from "@/lib/archivos";
import { proyectoVisible } from "@/lib/contratacion-server";

type Ctx = { params: Promise<{ id: string }> };
const BUCKET = "adjuntos";

async function leerPdf(form: FormData | null) {
  const file = form?.get("archivo");
  if (!(file instanceof File) || file.size === 0) return { error: "Adjunta el contrato en PDF" } as const;
  if (file.size > MAX_ARCHIVO) return { error: "El archivo debe pesar menos de 4 MB" } as const;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniff(bytes, file.name)?.mime !== "application/pdf") return { error: "El contrato debe ser un PDF" } as const;
  return { bytes } as const;
}

// GET /api/proyectos/:id/contrato?archivo=contrato|firmado[&descargar=1] — redirige a una URL firmada de corta duración
export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const v = await proyectoVisible(auth.session, (await params).id);
  if ("error" in v) return v.error;
  const { proyecto, admin, esAdmin } = v;
  const sp = new URL(req.url).searchParams;
  const cual = sp.get("archivo") === "firmado" ? "firmado" : "contrato";
  const descargar = sp.has("descargar");

  const { data: c } = await admin.from("contratos").select("estado, archivo_path, firmado_path").eq("proyecto_id", proyecto.id).maybeSingle();
  const path = cual === "firmado" ? c?.firmado_path : c?.archivo_path;
  if (!c || !path) return json({ error: "Archivo no disponible" }, 404);

  // Download-to-sign is step 2: only after the client approves the contract
  if (cual === "contrato" && descargar && !esAdmin) {
    if (c.estado === "pendiente_aprobacion") return json({ error: "Primero aprueba el contrato" }, 409);
    if (c.estado === "aprobado") {
      const ahora = new Date().toISOString();
      await admin.from("contratos").update({ estado: "descargado", descargado_at: ahora, updated_at: ahora })
        .eq("proyecto_id", proyecto.id).eq("estado", "aprobado");
    }
  }
  const nombre = `${cual === "firmado" ? "Contrato firmado" : "Contrato"} - ${proyecto.nombre}.pdf`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 60, descargar ? { download: nombre } : undefined);
  if (error || !data) return json({ error: "No se pudo generar el enlace" }, 500);
  return NextResponse.redirect(data.signedUrl, 302);
}

// POST /api/proyectos/:id/contrato (multipart «archivo»)
//   admin   → emite o reemplaza el contrato (requiere presupuesto aprobado; no si ya está verificado)
//   cliente → sube la copia firmada (tras descargarlo, o si la firma fue rechazada)
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const v = await proyectoVisible(auth.session, (await params).id);
  if ("error" in v) return v.error;
  const { proyecto, admin, esAdmin } = v;
  const pdf = await leerPdf(await req.formData().catch(() => null));
  if ("error" in pdf) return json({ error: pdf.error }, 400);
  const ahora = new Date().toISOString();
  const { data: c } = await admin.from("contratos").select("estado").eq("proyecto_id", proyecto.id).maybeSingle();

  if (esAdmin) {
    const { data: pre } = await admin.from("presupuestos").select("estado").eq("proyecto_id", proyecto.id).maybeSingle();
    if (pre?.estado !== "aprobado") return json({ error: "El cliente debe aprobar el presupuesto antes de emitir el contrato" }, 409);
    if (c?.estado === "verificado") return json({ error: "El contrato ya está firmado y verificado" }, 409);
    const path = `contratos/${proyecto.id}/contrato-${Date.now()}.pdf`;
    const up = await admin.storage.from(BUCKET).upload(path, pdf.bytes, { contentType: "application/pdf" });
    if (up.error) return json({ error: "No se pudo subir el contrato" }, 500);
    const { error } = await admin.from("contratos").upsert({
      proyecto_id: proyecto.id, archivo_path: path, firmado_path: null, estado: "pendiente_aprobacion", observacion: null,
      aprobado_at: null, descargado_at: null, firmado_at: null, verificado_at: null, updated_at: ahora,
    }, { onConflict: "proyecto_id" });
    if (error) return json({ error: error.message }, 500);
    await registrarActividad({
      userId: proyecto.user_id, actorId: auth.session.user.id, accion: "contrato_emitido", entidad: "proyecto", entidadId: proyecto.id,
      descripcion: `Recibió el contrato de «${proyecto.nombre}» para su aprobación`,
    });
    return json({ ok: true }, 201);
  }

  if (proyecto.user_id !== auth.session.user.id) return json({ error: "Solo el cliente puede subir el contrato firmado" }, 403);
  if (!c || !["descargado", "firma_rechazada", "firmado"].includes(c.estado))
    return json({ error: "Aprueba y descarga el contrato antes de subir la copia firmada" }, 409);
  const path = `contratos/${proyecto.id}/firmado-${Date.now()}.pdf`;
  const up = await admin.storage.from(BUCKET).upload(path, pdf.bytes, { contentType: "application/pdf" });
  if (up.error) return json({ error: "No se pudo subir el contrato firmado" }, 500);
  const { error } = await admin.from("contratos")
    .update({ firmado_path: path, estado: "firmado", firmado_at: ahora, observacion: null, updated_at: ahora }).eq("proyecto_id", proyecto.id);
  if (error) return json({ error: error.message }, 500);
  await registrarActividad({
    userId: proyecto.user_id, accion: "contrato_firmado", entidad: "proyecto", entidadId: proyecto.id,
    descripcion: `Subió el contrato firmado de «${proyecto.nombre}»`,
  });
  return json({ ok: true }, 201);
}

// PATCH /api/proyectos/:id/contrato { accion }
//   cliente: "aprobar"      admin: "verificar" | "rechazar_firma" (+ observacion)
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireRole("user");
  if ("error" in auth) return auth.error;
  const v = await proyectoVisible(auth.session, (await params).id);
  if ("error" in v) return v.error;
  const { proyecto, admin, esAdmin } = v;
  const { accion, observacion } = await req.json().catch(() => ({}));
  const ahora = new Date().toISOString();

  const transiciones: Record<string, { de: string; a: Record<string, unknown>; admin: boolean; texto: string }> = {
    aprobar:        { de: "pendiente_aprobacion", a: { estado: "aprobado", aprobado_at: ahora }, admin: false, texto: "Aprobó el contrato de" },
    verificar:      { de: "firmado", a: { estado: "verificado", verificado_at: ahora, observacion: null }, admin: true, texto: "Contrato firmado y verificado para" },
    rechazar_firma: { de: "firmado", a: { estado: "firma_rechazada", observacion: str(observacion, 500) }, admin: true, texto: "Se pidió subir de nuevo el contrato firmado de" },
  };
  const t = transiciones[accion];
  if (!t || t.admin !== esAdmin) return json({ error: "Acción no permitida" }, 403);
  if (accion === "aprobar" && proyecto.user_id !== auth.session.user.id) return json({ error: "Solo el cliente puede aprobar el contrato" }, 403);
  if (accion === "rechazar_firma" && !t.a.observacion) return json({ error: "Indica qué debe corregir el cliente" }, 400);

  const { data, error } = await admin.from("contratos").update({ ...t.a, updated_at: ahora })
    .eq("proyecto_id", proyecto.id).eq("estado", t.de).select("id").maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "El contrato no está en el paso correcto para esta acción" }, 409);

  // A verified contract turns the prospect into a fixed client
  if (accion === "verificar") {
    const { data: perfil } = await admin.from("profiles").select("email, full_name").eq("id", proyecto.user_id).single();
    if (perfil?.email) {
      const email = perfil.email.toLowerCase();
      const { data: cli } = await admin.from("clientes").select("id").eq("email", email).maybeSingle();
      await (cli
        ? admin.from("clientes").update({ tipo: "fijo", updated_at: ahora }).eq("id", cli.id)
        : admin.from("clientes").insert({ email, nombre: perfil.full_name || email, tipo: "fijo" }));
    }
  }
  await registrarActividad({
    userId: proyecto.user_id, actorId: esAdmin ? auth.session.user.id : undefined, accion: `contrato_${accion}`,
    entidad: "proyecto", entidadId: proyecto.id, descripcion: `${t.texto} «${proyecto.nombre}»`,
  });
  return json({ ok: true });
}
