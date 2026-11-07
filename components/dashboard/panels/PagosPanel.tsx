"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, ShieldCheck, Clock } from "lucide-react";
import LogoMetodo from "@/components/pagos/LogoMetodo";
import RecargaDialog, { type Limites } from "@/components/dashboard/RecargaDialog";
import { useAuth } from "@/hooks/useAuth";
import { CAMPOS_METODO, type Metodo } from "@/lib/pagos";
import { cn } from "@/lib/utils";
import { PanelShell, Estado, cardStyle } from "./proyectos/comun";

/** Unified payment gateway: every method, its brand, how it is verified and how to pay. */
export default function PagosPanel({ metodo: inicial }: { metodo: string }) {
  const { isAdmin } = useAuth(false);
  const [metodos, setMetodos] = useState<Metodo[] | null>(null);
  const [limites, setLimites] = useState<Limites | null>(null);
  const [sel, setSel] = useState(inicial);
  const [error, setError] = useState("");
  const [recargar, setRecargar] = useState(false);

  useEffect(() => setSel(inicial), [inicial]);

  const cargar = () => {
    setError("");
    Promise.all([fetch("/api/metodos-pago"), fetch("/api/recargas")])
      .then(async ([a, b]) => {
        const [ja, jb] = await Promise.all([a.json(), b.json()]);
        if (!a.ok) throw new Error(ja.error);
        setMetodos(ja.metodos); setLimites(jb.limites);
      })
      .catch((e) => setError(e.message || "No se pudieron cargar los métodos de pago"));
  };
  useEffect(cargar, []);

  const actual = metodos?.find((m) => m.id === sel);
  const disponibles = metodos?.filter((m) => m.disponible) ?? [];

  return (
    <PanelShell title="Métodos de Pago" subtitle="Recarga tu saldo con el método que prefieras. Todos los pagos se acreditan en tu Estado de Cuenta.">
      {metodos && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metodos.map((m) => (
              <button key={m.id} onClick={() => setSel(m.id)} aria-pressed={sel === m.id}
                className={cn("rounded-2xl border p-4 flex items-center gap-3 text-left transition-colors",
                  sel === m.id ? "border-blue-accent/70" : "border-glass-bd hover:border-blue-accent/40", !m.disponible && "opacity-60")}
                style={cardStyle}>
                <LogoMetodo id={m.id} nombre={m.nombre} />
                <span className="min-w-0">
                  <span className="block text-sm font-ui font-semibold text-[#f0f4ff] truncate">{m.nombre}</span>
                  <span className="block text-[11px] text-silver/70">{m.moneda} · {m.tipo === "automatico" ? "en línea" : "transferencia"}</span>
                  <span className={cn("block text-[11px]", m.disponible ? "text-status-green" : "text-silver/50")}>{m.disponible ? "Disponible" : "No disponible"}</span>
                </span>
              </button>
            ))}
          </div>
          {!isAdmin && metodos.length === 0 && <p className="text-sm text-silver/70">Aún no hay métodos de pago habilitados.</p>}

          {actual && (
            <div className="rounded-2xl border border-glass-bd p-5 sm:p-6 flex flex-col gap-4" style={cardStyle}>
              <div className="flex items-center gap-4">
                <LogoMetodo id={actual.id} nombre={actual.nombre} />
                <div>
                  <p className="font-ui font-semibold text-[#f0f4ff]">{actual.nombre}</p>
                  <p className="text-xs text-silver flex items-center gap-1.5">
                    {actual.tipo === "automatico"
                      ? <><ShieldCheck className="w-3.5 h-3.5 text-blue-accent" /> Pago en línea · acreditación automática al confirmarse el cobro</>
                      : <><Clock className="w-3.5 h-3.5 text-yellow-400" /> Transferencia · acreditación tras verificar el pago</>}
                  </p>
                </div>
              </div>

              {actual.tipo === "manual" && CAMPOS_METODO[actual.id].some(([k]) => actual.datos?.[k]) && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CAMPOS_METODO[actual.id].filter(([k]) => actual.datos?.[k]).map(([k, label]) => (
                    <div key={k} className="rounded-lg border border-glass-bd/70 px-3 py-2">
                      <dt className="text-xs text-silver/60">{label}</dt>
                      <dd>
                        {actual.id === "pago_movil" && k === "titular" ? (
                          <span className="font-mono text-sm text-[#f0f4ff] break-all">{actual.datos[k]}</span>
                        ) : (
                          <button onClick={() => navigator.clipboard?.writeText(actual.datos[k])} title="Copiar"
                            className="flex items-center gap-1.5 font-mono text-sm text-[#f0f4ff] hover:text-cyan break-all text-left">
                            {actual.datos[k]} <Copy className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {actual.instrucciones && <p className="text-sm text-silver whitespace-pre-line">{actual.instrucciones}</p>}

              {actual.disponible ? (
                <button onClick={() => setRecargar(true)} disabled={!limites}
                  className="self-start flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui font-semibold text-white hover:shadow-glow">
                  <Plus className="w-4 h-4" /> Recargar saldo con {actual.nombre}
                </button>
              ) : (
                <p className="text-xs text-silver/60">
                  {isAdmin ? "Para habilitarlo, carga los datos de la cuenta receptora en Administración → Pagos." : "Este método aún no está habilitado."}
                </p>
              )}
            </div>
          )}
          {limites && (
            <RecargaDialog open={recargar} onClose={() => setRecargar(false)} limites={limites} metodos={disponibles} metodoInicial={sel} />
          )}
        </>
      )}
      <Estado loading={!metodos && !error} error={error} vacio={false} onRetry={cargar} mensajeVacio="" />
    </PanelShell>
  );
}
