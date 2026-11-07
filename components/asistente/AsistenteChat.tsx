"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, Mic, MicOff, RotateCcw, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { useIdioma } from "@/components/i18n/IdiomaProvider";
import { useVoz } from "@/hooks/useVoz";
import { cn } from "@/lib/utils";

const SUGERENCIAS = [
  "¿Qué servicios ofrecen?",
  "¿Cómo solicito un presupuesto?",
  "¿Cómo funciona la consultoría gratuita?",
  "¿Qué métodos de pago aceptan?",
];

/** Minimal formatting for the assistant's replies: **bold** and links. */
function Texto({ t }: { t: string }) {
  // Markdown list markers → bullets; single *italics* → plain text
  const limpio = t.replace(/^\s*[*-]\s+/gm, "• ").replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2").replace(/^#{1,6}\s+/gm, "");
  const partes = limpio.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="text-[#f0f4ff]">{p.slice(2, -2)}</strong>
        : /^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-cyan underline break-all">{p}</a>
        : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export default function AsistenteChat() {
  const [abierto, setAbierto] = useState(false);
  const [input, setInput] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error, setMessages, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/asistente" }),
  });
  const ocupado = status === "submitted" || status === "streaming";
  const { idioma } = useIdioma();
  const voz = useVoz(idioma);
  const [conVoz, setConVoz] = useState(false); // read every reply aloud
  const leidas = useRef(new Set<string>());

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, status]);

  // When a reply finishes streaming, read it aloud if voice mode is on
  useEffect(() => {
    if (status !== "ready" || !conVoz) return;
    const ultimo = messages.at(-1);
    if (!ultimo || ultimo.role !== "assistant" || leidas.current.has(ultimo.id)) return;
    leidas.current.add(ultimo.id);
    voz.hablar(ultimo.id, ultimo.parts.map((p) => (p.type === "text" ? p.text : "")).join(""));
  }, [status, messages, conVoz, voz]);

  function dictar() {
    if (voz.escuchando) return voz.dejarDeEscuchar();
    setConVoz(true); // speaking to the assistant → it answers by voice too
    voz.escuchar(setInput, (t) => enviar(t));
  }

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || ocupado) return;
    clearError();
    sendMessage({ text: t.slice(0, 1500) });
    setInput("");
  }

  return (
    <>
      <AnimatePresence>
        {!abierto && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setAbierto(true)}
            aria-label="Abrir asistente virtual"
            className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-gradient-cta text-white shadow-glow hover:scale-105 transition-transform"
          >
            <Bot className="w-5 h-5" />
            <span className="text-sm font-ui font-semibold hidden sm:inline">¿Te ayudo?</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {abierto && (
          <motion.section
            key="panel"
            role="dialog" aria-label="Asistente virtual de Technosoftware"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[min(600px,calc(100vh-3rem))] flex flex-col sm:rounded-2xl border border-glass-bd overflow-hidden shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
            style={{ background: "rgba(8,14,26,0.97)", backdropFilter: "blur(16px)" }}
          >
            <header className="flex items-center gap-3 px-4 py-3 border-b border-glass-bd" style={{ background: "linear-gradient(135deg, rgba(30,53,115,0.6), rgba(8,14,26,0.4))" }}>
              <span className="w-9 h-9 rounded-full bg-gradient-cta flex items-center justify-center shrink-0"><Bot className="w-5 h-5 text-white" /></span>
              <div className="flex-1 min-w-0">
                <p className="font-ui font-semibold text-sm text-[#f0f4ff]">Techno · Asistente virtual</p>
                <p className="text-[11px] text-status-green flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-green" /> En línea · respuestas con IA</p>
              </div>
              {voz.puedeHablar && (
                <button onClick={() => { if (conVoz) voz.callar(); setConVoz((x) => !x); }} aria-pressed={conVoz}
                  aria-label={conVoz ? "Desactivar respuestas habladas" : "Activar respuestas habladas"} title={conVoz ? "Respuestas habladas: activadas" : "Respuestas habladas: desactivadas"}
                  className={cn("p-2 rounded-lg hover:bg-white/5", conVoz ? "text-cyan" : "text-silver hover:text-white")}>
                  {conVoz ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              )}
              {messages.length > 0 && (
                <button onClick={() => { setMessages([]); clearError(); voz.callar(); }} aria-label="Nueva conversación" title="Nueva conversación" className="p-2 rounded-lg text-silver hover:text-white hover:bg-white/5">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setAbierto(false)} aria-label="Cerrar asistente" className="p-2 rounded-lg text-silver hover:text-white hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" aria-live="polite">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-silver bg-white/5 border border-glass-bd">
                ¡Hola! Soy <strong className="text-[#f0f4ff]">Techno</strong>. Puedo contarte sobre nuestros servicios, cómo pedir un presupuesto, la consultoría gratuita o los métodos de pago. ¿En qué te ayudo?
              </div>
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button key={s} onClick={() => enviar(s)} className="px-3 py-1.5 rounded-full border border-blue-accent/40 text-xs text-[#f0f4ff] hover:bg-blue-accent/15 text-left">{s}</button>
                  ))}
                </div>
              )}
              {messages.map((m) => {
                const texto = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                if (!texto) return null;
                return (
                  <div key={m.id} translate="no" className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line break-words",
                    m.role === "user" ? "self-end rounded-tr-sm bg-gradient-cta text-white" : "rounded-tl-sm text-silver bg-white/5 border border-glass-bd")}>
                    {m.role === "user" ? texto : <Texto t={texto} />}
                    {m.role === "assistant" && voz.puedeHablar && !(ocupado && m.id === messages.at(-1)?.id) && (
                      <button type="button" onClick={() => (voz.hablando === m.id ? voz.callar() : voz.hablar(m.id, texto))}
                        aria-label={voz.hablando === m.id ? "Detener lectura" : "Escuchar respuesta"}
                        className="mt-1.5 flex items-center gap-1 text-[11px] text-cyan/80 hover:text-cyan">
                        {voz.hablando === m.id ? <><Square className="w-3 h-3" /> Detener</> : <><Volume2 className="w-3 h-3" /> Escuchar</>}
                      </button>
                    )}
                  </div>
                );
              })}
              {status === "submitted" && (
                <div className="flex items-center gap-2 text-xs text-silver/70"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Escribiendo…</div>
              )}
              {error && (
                <p className="text-xs text-red-400 rounded-xl border border-red-400/40 px-3 py-2">
                  {/429/.test(error.message) ? "Has enviado muchos mensajes seguidos. Intenta de nuevo en unos minutos." : "No pude responder ahora. Intenta de nuevo o escríbenos por WhatsApp."}
                </p>
              )}
              <div ref={fin} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); enviar(input); }} className="flex items-end gap-2 p-3 border-t border-glass-bd" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              <textarea
                value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={1500}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); } }}
                placeholder={voz.escuchando ? "Escuchando…" : "Escribe o habla tu pregunta…"} aria-label="Mensaje para el asistente"
                className="flex-1 resize-none max-h-32 rounded-xl border border-glass-bd bg-navy-deep/60 px-3 py-2.5 text-sm text-[#f0f4ff] placeholder:text-silver/50 focus:outline-none focus:border-blue-accent/60"
              />
              {voz.puedeEscuchar && (
                <button type="button" onClick={dictar} disabled={ocupado && !voz.escuchando}
                  aria-label={voz.escuchando ? "Detener dictado" : "Hablar con el asistente"} title={voz.escuchando ? "Escuchando… toca para terminar" : "Habla tu pregunta"}
                  className={cn("h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center disabled:opacity-50",
                    voz.escuchando ? "border-red-400/60 bg-red-500/20 text-red-300 animate-pulse" : "border-glass-bd text-silver hover:text-white hover:bg-white/5")}>
                  {voz.escuchando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button type="submit" disabled={!input.trim() || ocupado} aria-label="Enviar"
                className="h-11 w-11 shrink-0 rounded-xl bg-gradient-cta text-white flex items-center justify-center disabled:opacity-50">
                {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <p className="px-3 pb-2 text-[10px] text-silver/40 text-center">Respuestas generadas con IA; pueden contener errores. No compartas datos sensibles.</p>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
