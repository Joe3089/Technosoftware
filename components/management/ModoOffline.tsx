"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, Loader2, RefreshCw, Wifi, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGestion } from "./contexto";
import { Modal, fmtFechaHora } from "./ui";
import { descartarFallida, estadoCola, precargar, sincronizar } from "@/lib/offline/sync";
import { iniciarTiempoReal } from "@/lib/offline/tiempoReal";

type Estado = Awaited<ReturnType<typeof estadoCola>>;

/**
 * Activa el trabajo sin conexión y el tiempo real, y muestra su estado en el encabezado:
 * en línea / sin conexión, cambios pendientes, rechazados y última sincronización.
 */
export function ModoOffline() {
  const { sesion, avisar, recargar } = useGestion();
  const [online, setOnline] = useState(true);
  const [vivo, setVivo] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const refrescar = useCallback(() => { estadoCola().then(setEstado).catch(() => null); }, []);

  // Service worker (solo producción) + preparación del equipo para trabajar sin conexión
  useEffect(() => {
    if (!sesion?.email) return;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw-gestion.js").catch(() => null);
    const id = window.setTimeout(() => precargar(sesion.email), 2000); // tras la carga inicial
    const cada = window.setInterval(() => navigator.onLine && precargar(sesion.email), 10 * 60 * 1000);
    return () => { window.clearTimeout(id); window.clearInterval(cada); };
  }, [sesion?.email]);

  // Tiempo real mientras haya conexión
  useEffect(() => {
    if (!sesion?.staff) return;
    const detener = iniciarTiempoReal();
    const tr = (e: Event) => setVivo((e as CustomEvent<string>).detail === "SUBSCRIBED");
    const notif = () => recargar();
    window.addEventListener("gestion:tiempo-real", tr);
    window.addEventListener("gestion:notificacion", notif);
    return () => { detener(); window.removeEventListener("gestion:tiempo-real", tr); window.removeEventListener("gestion:notificacion", notif); };
  }, [sesion?.staff, recargar]);

  // Conexión: al volver la red se envían los cambios pendientes
  useEffect(() => {
    setOnline(navigator.onLine);
    refrescar();
    const on = async () => {
      setOnline(true);
      const r = await sincronizar();
      if (r.enviados) avisar(`Conexión restablecida: ${r.enviados} cambio(s) sincronizado(s)`);
      if (r.fallidos) avisar(`${r.fallidos} cambio(s) rechazado(s) por el servidor. Revísalos en el indicador de sincronización.`, "error");
      recargar();
    };
    const off = () => { setOnline(false); avisar("Sin conexión: sigues trabajando; los cambios se enviarán al volver la red", "error"); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("gestion:cola", refrescar);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("gestion:cola", refrescar); };
  }, [avisar, recargar, refrescar]);

  const pendientes = estado?.pendientes ?? 0;
  const fallidas = estado?.fallidas.length ?? 0;
  return (
    <>
      <button onClick={() => setAbierto(true)} title="Estado de conexión y sincronización"
        className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-ui font-semibold",
          !online ? "border-amber-500/50 bg-amber-500/10 text-amber-200" : fallidas ? "border-red-500/50 bg-red-500/10 text-red-200" : "border-status-green/40 bg-status-green/10 text-status-green")}>
        {!online ? <CloudOff className="w-3.5 h-3.5" /> : fallidas ? <AlertTriangle className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
        <span className="hidden md:inline">{!online ? "Sin conexión" : vivo ? "En vivo" : "En línea"}</span>
        {pendientes > 0 && <span className="rounded-full bg-white/15 px-1.5" translate="no">{pendientes}</span>}
      </button>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo="Conexión y sincronización" ancho="max-w-lg"
        descripcion="La gestión funciona sin internet con los datos guardados en este equipo. Con conexión, los cambios de todo el equipo llegan en tiempo real.">
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-2">
            <div><dt className="text-xs text-silver">Estado</dt><dd>{!online ? "Sin conexión" : vivo ? "En línea · tiempo real activo" : "En línea"}</dd></div>
            <div><dt className="text-xs text-silver">Cambios por enviar</dt><dd translate="no">{pendientes}</dd></div>
            <div><dt className="text-xs text-silver">Última sincronización</dt><dd>{fmtFechaHora(estado?.ultimaSync)}</dd></div>
            <div><dt className="text-xs text-silver">Datos descargados</dt><dd>{fmtFechaHora(estado?.ultimaDescarga)}</dd></div>
          </dl>
          <Button size="sm" disabled={!online || ocupado} onClick={async () => {
            setOcupado(true);
            const r = await sincronizar();
            if (sesion?.email) await precargar(sesion.email);
            setOcupado(false); recargar();
            avisar(`Sincronizado: ${r.enviados} enviado(s)${r.fallidos ? `, ${r.fallidos} rechazado(s)` : ""}`, r.fallidos ? "error" : "ok");
          }}>{ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Sincronizar ahora</Button>
          {fallidas > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-red-200">El servidor rechazó estos cambios hechos sin conexión (permisos o reglas del sistema). Rehazlos con conexión o descártalos:</p>
              <ul className="space-y-1.5">
                {estado!.fallidas.map((f) => (
                  <li key={f.n} className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-950/20 px-2 py-1.5 text-xs">
                    <span className="flex-1"><span className="text-white">{f.metodo === "POST" ? "Alta" : f.metodo === "PATCH" ? "Edición" : "Baja"} en {f.recurso ?? f.url}</span>
                      <span className="block text-red-200">{f.error}</span><span className="block text-silver/60">{fmtFechaHora(f.creado)}</span></span>
                    <button onClick={() => descartarFallida(f.n)} aria-label="Descartar" className="text-silver hover:text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[11px] text-silver/70">Los datos se guardan solo en este equipo, dentro del perfil del navegador, y se borran al cerrar sesión. No uses la gestión sin conexión en equipos compartidos. Crear accesos, desvincular personal y descargar archivos requieren conexión.</p>
        </div>
      </Modal>
    </>
  );
}
