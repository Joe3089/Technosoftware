"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, Loader2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LogoMetodo from "@/components/pagos/LogoMetodo";
import { CAMPOS_METODO, REFERENCIA, type Metodo } from "@/lib/pagos";
import { cn } from "@/lib/utils";
import TasasTicker from "@/components/common/TasasTicker";

export interface Limites { min: number; max: number; moneda: string }

const hoy = () => new Date().toISOString().slice(0, 10);

export default function RecargaDialog({ open, onClose, limites, metodos, metodoInicial, onReportado }: {
  open: boolean; onClose: () => void; limites: Limites; metodos: Metodo[]; metodoInicial?: string; onReportado?: () => void;
}) {
  const [metodoId, setMetodoId] = useState<string>("");
  const [monto, setMonto] = useState("");
  const [paso, setPaso] = useState<"inicio" | "pago" | "listo">("inicio");
  const [referencia, setReferencia] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [montoOrigen, setMontoOrigen] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setMetodoId(metodos.some((m) => m.id === metodoInicial) ? metodoInicial! : metodos[0]?.id ?? "");
  }, [open, metodoInicial, metodos]);

  const metodo = metodos.find((m) => m.id === metodoId);
  const money = (n: number) => new Intl.NumberFormat("es", { style: "currency", currency: limites.moneda }).format(n);
  const valor = Number(monto);

  function continuar() {
    setError("");
    if (!metodo) return setError("Elige un método de pago.");
    if (!/^\d+(\.\d{1,2})?$/.test(monto)) return setError("Ingresa un importe válido (máximo 2 decimales).");
    if (valor < limites.min || valor > limites.max) return setError(`El importe debe estar entre ${money(limites.min)} y ${money(limites.max)}.`);
    setPaso("pago");
  }

  async function pagarPaypal() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/recargas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metodo: "paypal", monto, moneda: limites.moneda }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "No se pudo iniciar el pago");
      window.location.assign(j.approveUrl);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  async function reportar() {
    setError("");
    if (!REFERENCIA.test(referencia.trim())) return setError("La referencia debe tener de 4 a 60 caracteres.");
    if (metodo!.moneda !== limites.moneda && !(Number(montoOrigen) > 0)) return setError(`Indica el monto pagado en ${metodo!.moneda}.`);
    if (!comprobante) return setError("Adjunta la captura o el comprobante del pago.");
    if (comprobante.size > 4 * 1024 * 1024) return setError("El comprobante debe pesar menos de 4 MB.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("metodo", metodo!.id); fd.append("monto", monto); fd.append("referencia", referencia.trim()); fd.append("fecha_pago", fecha);
      if (metodo!.moneda !== limites.moneda) fd.append("monto_origen", montoOrigen);
      if (comprobante) fd.append("comprobante", comprobante, comprobante.name);
      const r = await fetch("/api/recargas", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo registrar el pago");
      setAviso("");
      setPaso("listo");
      onReportado?.();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  function cerrar() {
    if (busy) return;
    setMonto(""); setPaso("inicio"); setReferencia(""); setFecha(hoy()); setMontoOrigen(""); setComprobante(null); setError(""); setAviso("");
    onClose();
  }

  const err = error && <p className="flex items-center gap-2 text-xs text-red-400" role="alert"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}</p>;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && cerrar()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Recargar el saldo</DialogTitle></DialogHeader>
        <TasasTicker />

        {paso === "inicio" && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Método de pago</Label>
              {metodos.length === 0 ? (
                <p className="text-sm text-silver/70">Aún no hay métodos de pago habilitados. Intenta más tarde.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup">
                  {metodos.map((m) => (
                    <button key={m.id} type="button" role="radio" aria-checked={metodoId === m.id} onClick={() => setMetodoId(m.id)}
                      className={cn("flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors",
                        metodoId === m.id ? "border-blue-accent/70 bg-blue-accent/15" : "border-glass-bd hover:border-blue-accent/40")}>
                      <LogoMetodo id={m.id} nombre={m.nombre} size="sm" />
                      <span className="text-xs font-ui text-[#f0f4ff] text-center">{m.nombre}</span>
                      <span className="text-[10px] text-silver/60">{m.tipo === "automatico" ? "Pago en línea" : "Transferencia"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recarga-monto">Importe a acreditar ({limites.moneda})</Label>
              <Input id="recarga-monto" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value.replace(",", "."))}
                onKeyDown={(e) => e.key === "Enter" && continuar()} placeholder="0.00" />
              <p className="text-xs text-silver/60">Mínimo {money(limites.min)} · máximo {money(limites.max)} por operación.</p>
            </div>
            {err}
            <button onClick={continuar} disabled={!metodos.length}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui text-white hover:shadow-glow disabled:opacity-50">
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {paso === "pago" && metodo && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-3">
              <LogoMetodo id={metodo.id} nombre={metodo.nombre} />
              <div>
                <p className="font-ui font-semibold text-[#f0f4ff]">{metodo.nombre}</p>
                <p className="text-sm text-silver">Se acreditarán <strong className="text-status-green">{money(valor)}</strong></p>
              </div>
            </div>

            {metodo.tipo === "automatico" ? (
              <>
                <p className="flex items-start gap-2 text-xs text-silver/70">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-blue-accent" />
                  Serás redirigido a {metodo.nombre}. El saldo se acredita solo cuando la pasarela confirma el cobro; nunca guardamos datos de tu tarjeta.
                </p>
                {err}
                <div className="flex gap-3">
                  <button onClick={() => setPaso("inicio")} disabled={busy} className="flex-1 py-2.5 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white">Volver</button>
                  <button onClick={pagarPaypal} disabled={busy} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui text-white disabled:opacity-60">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} Pagar con {metodo.nombre}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-glass-bd p-3 flex flex-col gap-1.5">
                  <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/60">1. Envía el pago a</p>
                  {CAMPOS_METODO[metodo.id].filter(([k]) => metodo.datos[k]).map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-silver/70">{label}</span>
                      {/* Pago Móvil only needs banco/teléfono/documento to send; the holder is informative. */}
                      {metodo.id === "pago_movil" && k === "titular" ? (
                        <span className="font-mono text-[#f0f4ff] text-right break-all">{metodo.datos[k]}</span>
                      ) : <button type="button" onClick={() => navigator.clipboard?.writeText(metodo.datos[k])} title="Copiar"
                        className="flex items-center gap-1.5 font-mono text-[#f0f4ff] hover:text-cyan text-right break-all">
                        {metodo.datos[k]} <Copy className="w-3.5 h-3.5 shrink-0" />
                      </button>}
                    </div>
                  ))}
                  {metodo.instrucciones && <p className="text-xs text-silver/70 whitespace-pre-line mt-1">{metodo.instrucciones}</p>}
                  {metodo.moneda !== limites.moneda && <p className="text-xs text-yellow-400 mt-1">Este método se paga en {metodo.moneda}; usa la tasa indicada en las instrucciones.</p>}
                </div>

                <p className="text-xs font-ui font-semibold uppercase tracking-widest text-silver/60">2. Reporta tu pago</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="ref">Número de referencia / confirmación</Label>
                    <Input id="ref" value={referencia} maxLength={60} onChange={(e) => setReferencia(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fpago">Fecha del pago</Label>
                    <Input id="fpago" type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} className="[color-scheme:dark]" />
                  </div>
                  {metodo.moneda !== limites.moneda && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="morig">Monto pagado ({metodo.moneda})</Label>
                      <Input id="morig" inputMode="decimal" value={montoOrigen} onChange={(e) => setMontoOrigen(e.target.value.replace(",", "."))} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="comp">Captura del comprobante <span className="text-red-400">*</span> <span className="text-silver/40 font-normal normal-case">(imagen o PDF, máx. 4 MB)</span></Label>
                    <input id="comp" type="file" required accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                      className="text-xs text-silver file:mr-3 file:rounded-lg file:border file:border-glass-bd file:bg-transparent file:px-3 file:py-1.5 file:text-silver" />
                  </div>
                </div>
                <p className="text-xs text-silver/60">Tu saldo se acreditará cuando nuestro equipo verifique el pago en la cuenta receptora.</p>
                {err}
                <div className="flex gap-3">
                  <button onClick={() => setPaso("inicio")} disabled={busy} className="flex-1 py-2.5 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white">Volver</button>
                  <button onClick={reportar} disabled={busy} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui text-white disabled:opacity-60">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} Reportar pago
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {paso === "listo" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-status-green" />
            <p className="font-ui font-semibold text-[#f0f4ff]">Pago reportado</p>
            <p className="text-sm text-silver">Está <strong className="text-yellow-400">en verificación</strong>. Verás el saldo acreditado cuando lo confirmemos.</p>
            {aviso && <p className="text-xs text-yellow-400">{aviso}</p>}
            <button onClick={cerrar} className="mt-2 px-6 py-2 rounded-lg bg-gradient-cta text-sm font-ui text-white">Cerrar</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
