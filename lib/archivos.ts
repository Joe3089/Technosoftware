export const MAX_ARCHIVO = 4 * 1024 * 1024;   // Vercel functions accept ~4.5 MB per request

const ZIP_TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Real type from the file signature (+ extension only to tell docx from xlsx). Never trusts the declared MIME. */
export function sniff(b: Uint8Array, nombre: string): { mime: string; ext: string } | null {
  const head = String.fromCharCode(...b.slice(0, 12));
  if (head.startsWith("%PDF-")) return { mime: "application/pdf", ext: "pdf" };
  if (b[0] === 0x89 && head.slice(1, 4) === "PNG") return { mime: "image/png", ext: "png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 && ext in ZIP_TYPES) return { mime: ZIP_TYPES[ext], ext };
  return null;
}

export const nombreSeguro = (n: string, ext: string) => n.replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, "_").slice(0, 120) || `archivo.${ext}`;
