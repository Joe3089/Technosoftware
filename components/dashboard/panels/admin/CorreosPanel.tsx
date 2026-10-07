"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, FlaskConical, CheckCircle, AlertCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Segmento = "interesados" | "fijos" | "todos";
interface Campana { id: string; asunto: string; segmento: string; enviados: number; fallidos: number; created_at: string }

const SEGMENTOS: { id: Segmento; label: string }[] = [
  { id: "interesados", label: "Interesados" },
  { id: "fijos", label: "Clientes fijos" },
  { id: "todos", label: "Todos" },
];

export default function CorreosPanel() {
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("Hola {{nombre}},\n\n");
  const [segmento, setSegmento] = useState<Segmento>("interesados");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [campanas, setCampanas] = useState<Campana[]>([]);

  async function loadHistory() {
    const res = await fetch("/api/emails/masivo");
    if (res.ok) setCampanas((await res.json()).campanas);
  }
  useEffect(() => { loadHistory(); }, []);

  async function send(prueba: boolean) {
    if (!asunto.trim() || !mensaje.trim()) return setResult({ ok: false, text: "Escribe un asunto y un mensaje." });
    if (!prueba && !confirm(`¿Enviar este correo a: ${SEGMENTOS.find((s) => s.id === segmento)?.label}?`)) return;
    setSending(true);
    setResult(null);
    const res = await fetch("/api/emails/masivo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asunto, mensaje, segmento, prueba }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) return setResult({ ok: false, text: data.error ?? "No se pudo enviar" });
    setResult({
      ok: data.fallidos ? false : true,
      text: prueba ? "Correo de prueba enviado a tu bandeja." : `Enviados: ${data.enviados} de ${data.total}${data.fallidos ? ` · Fallidos: ${data.fallidos}` : ""}`,
    });
    if (!prueba) loadHistory();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="font-ui text-xl font-semibold text-[#f0f4ff]">Correos Masivos</h2>
        <p className="text-sm text-silver mt-1">
          Envía un correo a todos los clientes de un segmento. Escribe <code className="text-cyan">{"{{nombre}}"}</code> para personalizar con el nombre de cada cliente.
        </p>
      </div>

      <div className="glass-card rounded-xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Destinatarios</Label>
          <div className="inline-flex flex-wrap p-1 rounded-lg border border-glass-bd w-fit">
            {SEGMENTOS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSegmento(s.id)}
                className={cn("px-4 py-1.5 rounded-md text-sm font-ui font-semibold transition-colors",
                  segmento === s.id ? "bg-blue-accent/20 text-white" : "text-silver hover:text-white")}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-asunto">Asunto</Label>
          <Input id="m-asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={200} placeholder="Novedades de Technosoftware" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-mensaje">Mensaje</Label>
          <textarea id="m-mensaje" rows={10} value={mensaje} onChange={(e) => setMensaje(e.target.value)}
            className="rounded-lg bg-navy-mid/60 border border-glass-bd p-3 text-sm text-[#f0f4ff] leading-relaxed" />
        </div>

        {result && (
          <div className={cn("flex items-center gap-2 p-3 rounded-lg border text-sm",
            result.ok ? "bg-status-green/10 border-status-green/30 text-status-green" : "bg-red-900/30 border-red-700/40 text-red-300")}>
            {result.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {result.text}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" disabled={sending} onClick={() => send(true)}>
            <FlaskConical className="w-4 h-4" /> Enviarme una prueba
          </Button>
          <Button type="button" disabled={sending} onClick={() => send(false)}>
            <Send className="w-4 h-4" /> {sending ? "Enviando…" : "Enviar campaña"}
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-ui font-semibold text-lg text-[#f0f4ff] mb-4"><History className="w-5 h-5" /> Historial</h3>
        {campanas.length === 0 ? (
          <p className="text-sm text-silver">Aún no se han enviado campañas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-glass-bd/50">
            {campanas.map((c) => (
              <li key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <p className="text-[#f0f4ff]">{c.asunto}</p>
                  <p className="text-silver">{new Date(c.created_at).toLocaleString("es")} · {c.segmento}</p>
                </div>
                <span className="text-silver">{c.enviados} enviados{c.fallidos ? ` · ${c.fallidos} fallidos` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
