"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ListTodo, FolderKanban, Contact, Building2, Target, Users, Wallet, LifeBuoy, BarChart3, Settings,
  Bell, Menu, X, LogOut, ArrowLeftRight, Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { etiquetaRol } from "@/lib/services/constantes";
import { api, useGestion } from "@/components/management/contexto";
import { campoCls, fmtFechaHora } from "@/components/management/ui";
import { ModoOffline } from "@/components/management/ModoOffline";
import { borrarTodo } from "@/lib/offline/idb";

const NAV = [
  { href: "/dashboard/inicio", texto: "Dashboard", icono: LayoutDashboard },
  { href: "/dashboard/planificacion", texto: "Actividades", icono: ListTodo },
  { href: "/dashboard/proyectos", texto: "Proyectos", icono: FolderKanban },
  { href: "/dashboard/contactos", texto: "Contactos", icono: Contact, permiso: "contactos.ver" },
  { href: "/dashboard/clientes", texto: "Clientes", icono: Building2, permiso: "clientes.ver" },
  { href: "/dashboard/crm", texto: "CRM", icono: Target, permiso: ["crm.ver", "crm.gestionar"] },
  { href: "/dashboard/empleados", texto: "Talento Humano", icono: Users, permiso: "empleados.ver" },
  { href: "/dashboard/contabilidad", texto: "Finanzas", icono: Wallet, permiso: "finanzas.ver" },
  { href: "/dashboard/soporte", texto: "Soporte", icono: LifeBuoy },
  { href: "/dashboard/estadisticas", texto: "Estadísticas y KPI", icono: BarChart3, permiso: "kpi.ver" },
  { href: "/dashboard/configuracion", texto: "Configuración", icono: Settings, admin: true },
] as const;


export default function Shell({ children }: { children: React.ReactNode }) {
  const { sesion, puede, esAdmin } = useGestion();
  const { logout } = useAuth(false);
  const ruta = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [ruta]);

  const items = NAV.filter((n) => ("admin" in n && n.admin ? esAdmin : !("permiso" in n) || [n.permiso].flat().some(puede)));
  const activo = (href: string) => (href === "/dashboard/inicio" ? ruta === href : ruta.startsWith(href));

  const lateral = (
    <nav aria-label="Módulos" className="flex flex-col gap-0.5 p-3">
      {items.map(({ href, texto, icono: I }) => (
        <Link key={href} href={href} aria-current={activo(href) ? "page" : undefined}
          className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-ui transition-colors",
            activo(href) ? "bg-blue-accent/15 text-white border border-blue-accent/30" : "text-silver hover:text-white hover:bg-white/5 border border-transparent")}>
          <I className={cn("w-4 h-4 shrink-0", activo(href) && "text-cyan")} />{texto}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy-deep text-[#f0f4ff] flex">
      <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 border-r border-glass-bd bg-navy/70 sticky top-0 h-screen overflow-y-auto">
        <Marca />
        {lateral}
      </aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenu(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-navy border-r border-glass-bd overflow-y-auto">
            <div className="flex items-center justify-between pr-3"><Marca /><button onClick={() => setMenu(false)} aria-label="Cerrar menú"><X className="w-5 h-5" /></button></div>
            {lateral}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-2 sm:gap-3 border-b border-glass-bd bg-navy-deep/85 backdrop-blur px-3 sm:px-5 h-14">
          <button className="lg:hidden p-1.5 text-silver" onClick={() => setMenu(true)} aria-label="Abrir menú"><Menu className="w-5 h-5" /></button>
          <BuscadorGlobal />
          <ModoOffline />
          <Notificaciones />
          <div className="hidden sm:flex flex-col items-end leading-tight min-w-0">
            <span className="text-sm font-ui text-[#f0f4ff] truncate max-w-[180px]">{sesion?.empleado ? `${sesion.empleado.nombre} ${sesion.empleado.apellido}` : sesion?.nombre}</span>
            <span className="text-[11px] text-cyan">{sesion ? etiquetaRol(sesion.rol, sesion.coordinador) : ""}</span>
          </div>
          <Link href="/dashboard" className="p-2 text-silver hover:text-white" title="Ir al área de clientes" aria-label="Ir al área de clientes"><ArrowLeftRight className="w-4 h-4" /></Link>
          <button onClick={async () => { await borrarTodo(); navigator.serviceWorker?.controller?.postMessage("borrar-cache"); await logout(); }} className="p-2 text-silver hover:text-red-300" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut className="w-4 h-4" /></button>
        </header>
        <main className="flex-1 p-3 sm:p-5 lg:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function Marca() {
  return (
    <Link href="/dashboard/inicio" className="flex items-center gap-2 px-4 h-14 shrink-0">
      <Image src="/logo-icon.png" alt="" width={28} height={28} className="w-7 h-auto" />
      <span className="leading-tight">
        <span className="block font-brand font-bold text-sm tracking-wide" translate="no">TECHNOSOFTWARE</span>
        <span className="block text-[10px] text-silver uppercase tracking-widest">Gestión</span>
      </span>
    </Link>
  );
}

function BuscadorGlobal() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ tipo: string; texto: string; href: string }[]>([]);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(() => api<{ datos: typeof res }>(`/api/gestion/buscar?q=${encodeURIComponent(q)}`).then((r) => setRes(r.datos)).catch(() => setRes([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);
  return (
    <div ref={caja} className="relative flex-1 max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver/50" aria-hidden />
      <input value={q} onChange={(e) => { setQ(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)}
        placeholder="Buscar actividades, proyectos, contactos…" aria-label="Buscador global" className={cn(campoCls, "pl-9 h-9")} />
      {abierto && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-glass-bd bg-[#0b1430] shadow-glass max-h-80 overflow-y-auto">
          {!res.length ? <p className="px-3 py-2 text-sm text-silver/60">Sin resultados</p> : res.map((r, i) => (
            <button key={i} className="w-full text-left px-3 py-2 hover:bg-blue-accent/15 flex items-center gap-2 text-sm"
              onClick={() => { router.push(r.href); setAbierto(false); setQ(""); }}>
              <span className="text-[10px] uppercase tracking-wider text-cyan w-20 shrink-0">{r.tipo}</span>
              <span className="truncate">{r.texto}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Notif = { id: string; titulo: string; cuerpo: string | null; enlace: string | null; leida_at: string | null; created_at: string };
function Notificaciones() {
  const { sesion, recargar } = useGestion();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<Notif[] | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const pendientes = sesion?.notificaciones ?? 0;

  useEffect(() => {
    if (!abierto) return;
    api<{ datos: Notif[] }>("/api/gestion/notificaciones").then((r) => setLista(r.datos)).catch(() => setLista([]));
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);
  // Sin polling constante: se actualiza al volver a la pestaña
  useEffect(() => {
    const vis = () => document.visibilityState === "visible" && recargar();
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [recargar]);

  const marcar = async (ids?: string[]) => {
    await api("/api/gestion/notificaciones", { method: "PATCH", json: { ids } }).catch(() => null);
    setLista((l) => l?.map((n) => (!ids || ids.includes(n.id) ? { ...n, leida_at: n.leida_at ?? new Date().toISOString() } : n)) ?? null);
    recargar();
  };

  return (
    <div ref={caja} className="relative">
      <button onClick={() => setAbierto((a) => !a)} className="relative p-2 text-silver hover:text-white" aria-label={`Notificaciones (${pendientes} sin leer)`}>
        <Bell className="w-5 h-5" />
        {pendientes > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white grid place-items-center" translate="no">{pendientes > 9 ? "9+" : pendientes}</span>}
      </button>
      {abierto && (
        <div className="absolute right-0 z-50 mt-1 w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-glass-bd bg-[#0b1430] shadow-glass">
          <div className="flex items-center justify-between px-3 py-2 border-b border-glass-bd">
            <span className="text-sm font-ui font-semibold">Notificaciones</span>
            {pendientes > 0 && <button className="text-xs text-blue-accent hover:underline" onClick={() => marcar()}>Marcar todas</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {lista === null ? <li className="px-3 py-3 text-sm text-silver/60">Cargando…</li>
              : !lista.length ? <li className="px-3 py-3 text-sm text-silver/60">Sin notificaciones</li>
              : lista.map((n) => (
                <li key={n.id}>
                  <button className={cn("w-full text-left px-3 py-2 hover:bg-white/5 border-b border-glass-bd/40", !n.leida_at && "bg-blue-accent/5")}
                    onClick={() => { marcar([n.id]); setAbierto(false); if (n.enlace) router.push(n.enlace); }}>
                    <p className="text-sm flex items-center gap-2">{!n.leida_at && <span className="w-2 h-2 rounded-full bg-cyan shrink-0" />}{n.titulo}</p>
                    {n.cuerpo && <p className="text-xs text-silver truncate">{n.cuerpo}</p>}
                    <p className="text-[10px] text-silver/50 mt-0.5">{fmtFechaHora(n.created_at)}</p>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
