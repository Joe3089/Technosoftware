"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Voice for the assistant using the browser's built-in engines (free, no API keys):
 *  - speechSynthesis → reads replies aloud (all modern browsers)
 *  - SpeechRecognition → dictation (Chrome, Edge, Safari, Samsung Internet; not Firefox)
 */

type Reconocedor = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
};

/** Plain text for speech: no markdown, emojis or URLs. */
const paraVoz = (t: string) => t
  .replace(/https?:\/\/\S+/g, "")
  .replace(/[*#_`>•]/g, "")
  .replace(/\p{Extended_Pictographic}/gu, "")
  .replace(/\s+/g, " ").trim();

export function useVoz(idioma: string) {
  const [hablando, setHablando] = useState<string | null>(null); // id of the message being read
  const [escuchando, setEscuchando] = useState(false);
  const [puedeHablar, setPuedeHablar] = useState(false);
  const [puedeEscuchar, setPuedeEscuchar] = useState(false);
  const rec = useRef<Reconocedor | null>(null);
  const lang = idioma === "es" ? "es-ES" : idioma === "it" ? "it-IT" : idioma;

  useEffect(() => {
    setPuedeHablar(typeof window !== "undefined" && "speechSynthesis" in window);
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setPuedeEscuchar(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => { window.speechSynthesis?.cancel(); rec.current?.abort(); };
  }, []);

  const callar = useCallback(() => { window.speechSynthesis?.cancel(); setHablando(null); }, []);

  const hablar = useCallback((id: string, texto: string) => {
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(paraVoz(texto));
    u.lang = lang;
    // Prefer a voice of the exact variant (es-VE/es-ES, pt-PT vs pt-BR…), then any of the language
    const voces = s.getVoices();
    u.voice = voces.find((v) => v.lang.replace("_", "-") === lang) ?? voces.find((v) => v.lang.startsWith(lang.slice(0, 2))) ?? null;
    u.rate = 1.02;
    u.onend = u.onerror = () => setHablando((h) => (h === id ? null : h));
    setHablando(id);
    s.speak(u);
  }, [lang]);

  /** Starts dictation; calls onTexto with the running transcript and onFin with the final one. */
  const escuchar = useCallback((onTexto: (t: string) => void, onFin: (t: string) => void) => {
    const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
    const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!R) return;
    window.speechSynthesis?.cancel();
    const r = new R();
    r.lang = lang; r.interimResults = true; r.continuous = false;
    let texto = "";
    r.onresult = (e) => {
      texto = Array.from(e.results).map((x) => x[0].transcript).join(" ").trim();
      onTexto(texto);
    };
    r.onend = () => { setEscuchando(false); if (texto) onFin(texto); };
    r.onerror = () => setEscuchando(false);
    rec.current = r;
    setEscuchando(true);
    r.start();
  }, [lang]);

  const dejarDeEscuchar = useCallback(() => rec.current?.stop(), []);

  return { hablando, escuchando, puedeHablar, puedeEscuchar, hablar, callar, escuchar, dejarDeEscuchar };
}
