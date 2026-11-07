"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Upload, RotateCcw, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const SIZE = 512; // final avatar is a 512×512 JPEG (also strips EXIF metadata)

type Modo = "archivo" | "camara";

/** Center-crops any drawable source to a square JPEG blob. */
function toSquareJpeg(src: CanvasImageSource, w: number, h: number, mirror = false): Promise<Blob> {
  const side = Math.min(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  if (mirror) { ctx.translate(SIZE, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo procesar la imagen"))), "image/jpeg", 0.88));
}

function cameraError(e: unknown): string {
  const name = (e as DOMException)?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Permiso de cámara denegado. Actívalo en la configuración del navegador o sube un archivo.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No se encontró ninguna cámara en este dispositivo.";
  if (name === "NotReadableError") return "La cámara está siendo usada por otra aplicación.";
  return "No se pudo acceder a la cámara. Puedes subir un archivo en su lugar.";
}

export default function AvatarCaptureDialog({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (foto: Blob) => Promise<void>;
}) {
  const [modo, setModo] = useState<Modo>("archivo");
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const camSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamReady(false);
  }

  function setPreviewBlob(blob: Blob | null) {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return blob ? { blob, url: URL.createObjectURL(blob) } : null;
    });
  }

  async function startCamera(cancelled: () => boolean) {
    setError("");
    if (!window.isSecureContext) { setError("La cámara solo funciona en conexiones seguras (HTTPS)."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      });
      // The dialog may have closed while the permission prompt was open
      if (cancelled()) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamReady(true);
      }
    } catch (e) {
      stopCamera();
      if (!cancelled()) setError(cameraError(e));
    }
  }

  // Start/stop the camera with the mode; always release it on close/unmount
  useEffect(() => {
    let cancelled = false;
    if (open && modo === "camara" && !preview) startCamera(() => cancelled);
    return () => { cancelled = true; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modo, preview]);

  async function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    try {
      setPreviewBlob(await toSquareJpeg(v, v.videoWidth, v.videoHeight, true));
    } catch (e) { setError((e as Error).message); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!TIPOS.includes(file.type)) { setError("Formato no permitido. Usa JPG, PNG o WebP."); return; }
    if (file.size > 10 * MAX_BYTES) { setError("La imagen es demasiado grande (máx. 20 MB antes de optimizar)."); return; }
    try {
      const bmp = await createImageBitmap(file);
      setPreviewBlob(await toSquareJpeg(bmp, bmp.width, bmp.height));
      bmp.close();
    } catch {
      setError("No se pudo leer la imagen. Prueba con otro archivo.");
    }
  }

  async function confirm() {
    if (!preview) return;
    if (preview.blob.size > MAX_BYTES) { setError("La imagen supera 2 MB."); return; }
    setSaving(true); setError("");
    try {
      await onSave(preview.blob);
      handleClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    stopCamera();
    setPreviewBlob(null);
    setError("");
    setModo("archivo");
    onClose();
  }

  const tab = (m: Modo, label: string, Icon: React.ElementType, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => { setPreviewBlob(null); setError(""); setModo(m); }}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-ui transition-all",
        modo === m ? "bg-blue-accent/20 text-[#f0f4ff] border border-blue-accent/40" : "text-silver hover:text-white",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !saving && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 p-1 rounded-xl border border-glass-bd mt-2">
          {tab("archivo", "Subir archivo", Upload)}
          {tab("camara", "Usar cámara", Camera, !camSupported)}
        </div>

        {/* Preview / camera area */}
        <div className="relative mx-auto mt-4 w-56 h-56 rounded-full overflow-hidden border-2 border-blue-accent/40 flex items-center justify-center"
          style={{ background: "rgba(77,127,255,0.08)" }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="Vista previa" className="w-full h-full object-cover" />
          ) : modo === "camara" ? (
            <>
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />
              {!camReady && !error && <Loader2 className="absolute w-8 h-8 text-blue-accent animate-spin" />}
            </>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 text-silver hover:text-white transition-colors">
              <Upload className="w-8 h-8" />
              <span className="text-sm font-ui">Elegir imagen</span>
              <span className="text-xs text-silver/50">JPG, PNG o WebP</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept={TIPOS.join(",")} className="hidden" onChange={handleFile} />

        {error && (
          <p className="flex items-start gap-2 mt-3 text-xs text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button type="button" onClick={handleClose} disabled={saving}
            className="flex-1 py-2.5 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white hover:bg-white/5 transition-all">
            Cancelar
          </button>
          {preview ? (
            <>
              <button type="button" onClick={() => (modo === "camara" ? setPreviewBlob(null) : fileRef.current?.click())} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-blue-accent/30 text-sm font-ui text-blue-accent hover:bg-blue-accent/10 transition-all">
                <RotateCcw className="w-4 h-4" /> Repetir
              </button>
              <button type="button" onClick={confirm} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui text-white hover:shadow-glow transition-all disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
              </button>
            </>
          ) : modo === "camara" ? (
            <button type="button" onClick={capture} disabled={!camReady}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui text-white hover:shadow-glow transition-all disabled:opacity-50">
              <Camera className="w-4 h-4" /> Tomar foto
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
