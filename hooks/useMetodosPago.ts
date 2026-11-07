"use client";

import { useEffect, useState } from "react";
import type { Metodo } from "@/lib/pagos";

/** Payment methods from the API: users only receive the available ones, admins receive all. */
export function useMetodosPago(enabled = true) {
  const [metodos, setMetodos] = useState<Metodo[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let vivo = true;
    fetch("/api/metodos-pago")
      .then((r) => (r.ok ? r.json() : { metodos: [] }))
      .then((j) => vivo && setMetodos(j.metodos ?? []))
      .catch(() => vivo && setMetodos([]));
    return () => { vivo = false; };
  }, [enabled]);
  return metodos;
}
