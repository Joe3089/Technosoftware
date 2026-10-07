"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Trash2, Pencil, X, Check, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Tipo = "interesado" | "fijo";
interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  empresa: string | null;
  servicio: string | null;
  notas: string | null;
  tipo: Tipo;
  suscrito: boolean;
  created_at: string;
}

const EMPTY = { nombre: "", email: "", telefono: "", empresa: "", servicio: "", notas: "", tipo: "interesado" as Tipo };
const FILTERS: { id: "" | Tipo; label: string }[] = [
  { id: "", label: "Todos" },
  { id: "interesado", label: "Interesados" },
  { id: "fijo", label: "Fijos" },
];

export default function ClientesPanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filter, setFilter] = useState<"" | Tipo>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null); // id, "new" or null
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("tipo", filter);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/clientes?${params}`);
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "No se pudieron cargar los clientes");
    else { setClientes(data.clientes); setError(""); }
    setLoading(false);
  }, [filter, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openNew() { setForm(EMPTY); setEditing("new"); }
  function openEdit(c: Cliente) {
    setForm({
      nombre: c.nombre, email: c.email, telefono: c.telefono ?? "", empresa: c.empresa ?? "",
      servicio: c.servicio ?? "", notas: c.notas ?? "", tipo: c.tipo,
    });
    setEditing(c.id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const isNew = editing === "new";
    const res = await fetch(isNew ? "/api/clientes" : `/api/clientes/${editing}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error ?? "No se pudo guardar");
    setEditing(null);
    load();
  }

  async function patch(id: string, body: Partial<Cliente>) {
    const res = await fetch(`/api/clientes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) load(); else setError((await res.json()).error);
  }

  async function remove(c: Cliente) {
    if (!confirm(`¿Eliminar a ${c.nombre} (${c.email})?`)) return;
    const res = await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    if (res.ok) load(); else setError((await res.json()).error);
  }

  const counts = {
    interesado: clientes.filter((c) => c.tipo === "interesado").length,
    fijo: clientes.filter((c) => c.tipo === "fijo").length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-ui text-xl font-semibold text-[#f0f4ff]">Clientes</h2>
          <p className="text-sm text-silver mt-1">
            Interesados (llegan desde el formulario de contacto) y clientes fijos.
            {!filter && !loading && ` ${counts.interesado} interesados · ${counts.fijo} fijos`}
          </p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Nuevo cliente</Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, correo o empresa" className="pl-9" />
        </div>
        <div className="inline-flex p-1 rounded-lg border border-glass-bd">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn("px-4 py-1.5 rounded-md text-sm font-ui font-semibold transition-colors",
                filter === f.id ? "bg-blue-accent/20 text-white" : "text-silver hover:text-white")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="glass-card rounded-xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <h3 className="sm:col-span-2 font-ui font-semibold text-lg text-[#f0f4ff]">
            {editing === "new" ? "Nuevo cliente" : "Editar cliente"}
          </h3>
          {([["nombre", "Nombre *"], ["email", "Correo *"], ["telefono", "Teléfono"], ["empresa", "Empresa"], ["servicio", "Servicio de interés"]] as const).map(([k, label]) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Label htmlFor={`c-${k}`}>{label}</Label>
              <Input id={`c-${k}`} type={k === "email" ? "email" : "text"} required={k === "nombre" || k === "email"}
                value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-tipo">Tipo</Label>
            <select id="c-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Tipo })}
              className="h-10 rounded-lg bg-navy-mid/60 border border-glass-bd px-3 text-sm text-[#f0f4ff]">
              <option value="interesado">Interesado</option>
              <option value="fijo">Fijo</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="c-notas">Notas</Label>
            <textarea id="c-notas" rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="rounded-lg bg-navy-mid/60 border border-glass-bd p-3 text-sm text-[#f0f4ff]" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" disabled={saving}><Check className="w-4 h-4" /> {saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-silver">Cargando…</p>
        ) : clientes.length === 0 ? (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <Users className="w-10 h-10 text-silver/50" />
            <p className="text-sm text-silver">No hay clientes {filter ? `de tipo ${filter}` : "todavía"}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-silver border-b border-glass-bd">
                <tr>
                  <th className="p-3 font-ui font-semibold">Cliente</th>
                  <th className="p-3 font-ui font-semibold hidden md:table-cell">Empresa</th>
                  <th className="p-3 font-ui font-semibold">Tipo</th>
                  <th className="p-3 font-ui font-semibold hidden sm:table-cell">Correos</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-b border-glass-bd/50 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-3">
                      <p className="text-[#f0f4ff] font-medium">{c.nombre}</p>
                      <p className="text-silver break-all">{c.email}</p>
                    </td>
                    <td className="p-3 text-silver hidden md:table-cell">{c.empresa ?? "—"}</td>
                    <td className="p-3">
                      <button
                        onClick={() => patch(c.id, { tipo: c.tipo === "fijo" ? "interesado" : "fijo" })}
                        title="Cambiar tipo"
                        className={cn("px-2.5 py-0.5 rounded-full border text-sm font-ui font-semibold",
                          c.tipo === "fijo" ? "text-status-green border-status-green/40 bg-status-green/10" : "text-cyan border-cyan/40 bg-cyan/10")}
                      >
                        {c.tipo === "fijo" ? "Fijo" : "Interesado"}
                      </button>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <label className="inline-flex items-center gap-2 text-silver cursor-pointer">
                        <input type="checkbox" checked={c.suscrito} onChange={() => patch(c.id, { suscrito: !c.suscrito })} />
                        {c.suscrito ? "Suscrito" : "No"}
                      </label>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-2 text-silver hover:text-white" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(c)} className="p-2 text-silver hover:text-red-400" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
