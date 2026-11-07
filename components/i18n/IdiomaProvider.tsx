"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { IDIOMA_BASE, esIdioma, type IdiomaId } from "@/lib/idiomas";

/*
 * Automatic page translation. The interface is written in Spanish; for another language this
 * engine swaps the text of visible nodes (and placeholder/title/aria-label/alt) in place, keeping
 * the original so React updates and switching back to Spanish work. Translations come from
 * /api/traducir (shared DB cache) and are kept per browser in localStorage.
 * Anything inside translate="no" is never touched (amounts, codes, the clock, chat messages…).
 */

const ATRIBUTOS = ["placeholder", "title", "aria-label", "alt"] as const;
const SALTAR = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "SVG", "INPUT", "SELECT", "OPTION"]);
const CLAVE_IDIOMA = "idioma";
const CLAVE_CACHE = (i: string) => `trad:v1:${i}`;

const tieneLetras = (t: string) => /\p{L}{2,}/u.test(t);
const excluido = (el: Element | null) => !!el?.closest('[translate="no"], [contenteditable="true"]');

interface Ctx { idioma: IdiomaId; cambiar: (i: IdiomaId) => void }
const IdiomaContext = createContext<Ctx>({ idioma: IDIOMA_BASE, cambiar: () => {} });
export const useIdioma = () => useContext(IdiomaContext);

export default function IdiomaProvider({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState<IdiomaId>(IDIOMA_BASE);

  // Restore the saved choice after hydration (the server always renders Spanish)
  useEffect(() => {
    try { const v = localStorage.getItem(CLAVE_IDIOMA); if (esIdioma(v)) setIdioma(v); } catch { /* storage blocked */ }
  }, []);

  const cambiar = useCallback((i: IdiomaId) => {
    setIdioma(i);
    try { localStorage.setItem(CLAVE_IDIOMA, i); } catch { /* storage blocked */ }
  }, []);

  useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);

  return (
    <IdiomaContext.Provider value={{ idioma, cambiar }}>
      <Motor idioma={idioma} />
      {children}
    </IdiomaContext.Provider>
  );
}

function Motor({ idioma }: { idioma: IdiomaId }) {
  // Original Spanish text per node / attribute, and the value we last wrote (to ignore our own mutations)
  const originales = useRef(new WeakMap<Text, string>());
  const aplicados = useRef(new WeakMap<Text, string>());
  const attrOrig = useRef(new WeakMap<Element, Record<string, string>>());
  const nodos = useRef(new Set<WeakRef<Text>>());
  const elementos = useRef(new Set<WeakRef<Element>>());

  useEffect(() => {
    const dicc: Record<string, string> = {};
    if (idioma !== IDIOMA_BASE) {
      try { Object.assign(dicc, JSON.parse(localStorage.getItem(CLAVE_CACHE(idioma)) || "{}")); } catch { /* ignore */ }
    }
    const pendientes = new Set<string>();
    const enVuelo = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let activo = true;

    const traducir = (t: string) => {
      const limpio = t.trim();
      if (idioma === IDIOMA_BASE || !tieneLetras(limpio)) return t;
      const tr = dicc[limpio];
      if (tr) return t.replace(limpio, tr);
      if (!enVuelo.has(limpio) && limpio.length <= 1200) { pendientes.add(limpio); programar(); }
      return t;
    };

    const textoNodo = (n: Text) => {
      const actual = n.nodeValue ?? "";
      if (aplicados.current.get(n) !== actual) { originales.current.set(n, actual); nodos.current.add(new WeakRef(n)); }
      const orig = originales.current.get(n) ?? actual;
      const nuevo = traducir(orig);
      if (nuevo !== actual) n.nodeValue = nuevo;
      aplicados.current.set(n, nuevo);
    };

    const atributos = (el: Element) => {
      let o = attrOrig.current.get(el);
      for (const a of ATRIBUTOS) {
        const v = el.getAttribute(a);
        if (v == null) continue;
        if (!o) { o = {}; attrOrig.current.set(el, o); elementos.current.add(new WeakRef(el)); }
        const aplicado = o[`__${a}`];
        if (o[a] === undefined || v !== aplicado) o[a] = v;
        const nuevo = traducir(o[a]);
        o[`__${a}`] = nuevo;
        if (nuevo !== v) el.setAttribute(a, nuevo);
      }
    };

    const recorrer = (raiz: Node) => {
      if (raiz.nodeType === Node.TEXT_NODE) {
        const p = raiz.parentElement;
        if (p && !SALTAR.has(p.tagName) && !excluido(p)) textoNodo(raiz as Text);
        return;
      }
      if (!(raiz instanceof Element) || SALTAR.has(raiz.tagName) || excluido(raiz)) return;
      atributos(raiz);
      const w = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          if (n.nodeType === Node.ELEMENT_NODE) {
            const el = n as Element;
            return SALTAR.has(el.tagName) || el.getAttribute("translate") === "no" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) textoNodo(n as Text); else atributos(n as Element);
      }
    };

    const guardarCache = (provisionales: string[] = []) => {
      // Provisional (non-AI) translations are used now but not kept, so better ones replace them later
      const guardar = { ...dicc };
      for (const t of provisionales) delete guardar[t];
      try { localStorage.setItem(CLAVE_CACHE(idioma), JSON.stringify(guardar)); } catch { /* quota */ }
    };

    // 1) The whole dictionary of the language arrives in one request; only texts it lacks go to the AI
    const diccionario = idioma === IDIOMA_BASE ? Promise.resolve() : fetch(`/api/traducir?idioma=${idioma}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!activo || !j?.traducciones) return;
        Object.assign(dicc, j.traducciones);
        guardarCache();
        recorrer(document.body);
      })
      .catch(() => { /* offline: local cache + per-text requests */ });

    async function lote(textos: string[]) {
      try {
        const r = await fetch("/api/traducir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idioma, textos }) });
        const j = await r.json();
        if (!activo || !j.traducciones) return;
        Object.assign(dicc, j.traducciones);
        guardarCache(j.provisionales);
        recorrer(document.body);
      } catch { /* network: keep Spanish */ }
    }

    // 2) Missing texts are sent in parallel batches (texts that come back untranslated aren't retried this session)
    async function pedir() {
      timer = null;
      await diccionario;
      if (!activo) return;
      const faltan = [...pendientes].filter((t) => !dicc[t]);
      pendientes.clear();
      if (!faltan.length) { recorrer(document.body); return; }
      faltan.forEach((t) => enVuelo.add(t));
      const lotes: string[][] = [];
      for (let i = 0; i < faltan.length; i += 40) lotes.push(faltan.slice(i, i + 40));
      await Promise.all(lotes.slice(0, 6).map(lote));
      lotes.slice(6).flat().forEach((t) => { enVuelo.delete(t); pendientes.add(t); });
      if (pendientes.size && activo) programar();
    }
    function programar() { if (!timer) timer = setTimeout(pedir, 30); }

    if (idioma === IDIOMA_BASE) {
      // Back to Spanish: restore every node and attribute we touched
      for (const ref of nodos.current) {
        const n = ref.deref(); const o = n && originales.current.get(n);
        if (n && o !== undefined && n.nodeValue !== o) n.nodeValue = o;
        if (n) aplicados.current.set(n, n.nodeValue ?? "");
      }
      for (const ref of elementos.current) {
        const el = ref.deref(); const o = el && attrOrig.current.get(el);
        if (el && o) for (const a of ATRIBUTOS) if (o[a] !== undefined) { el.setAttribute(a, o[a]); o[`__${a}`] = o[a]; }
      }
      return;
    }

    recorrer(document.body);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") { const p = m.target.parentElement; if (p && !excluido(p) && !SALTAR.has(p.tagName)) textoNodo(m.target as Text); }
        else if (m.type === "attributes") { if (!excluido(m.target as Element)) atributos(m.target as Element); }
        else m.addedNodes.forEach(recorrer);
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATRIBUTOS] });
    return () => { activo = false; obs.disconnect(); if (timer) clearTimeout(timer); };
  }, [idioma]);

  return null;
}
