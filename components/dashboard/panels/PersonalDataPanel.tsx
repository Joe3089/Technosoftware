"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User, Pencil, Save, X, Camera, Lock, Eye, EyeOff,
  CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePersonalData, isProfileComplete, completionPercent, type PersonalData } from "@/hooks/usePersonalData";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/* ─── Password strength ─── */
function strengthInfo(pw: string): { label: string; pct: number; color: string } {
  if (!pw) return { label: "", pct: 0, color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Muy débil", pct: 25,  color: "bg-red-500"    },
    { label: "Débil",     pct: 50,  color: "bg-orange-500" },
    { label: "Buena",     pct: 75,  color: "bg-yellow-400" },
    { label: "✓ Fuerte",  pct: 100, color: "bg-status-green" },
  ];
  return map[Math.min(score - 1, 3)] ?? map[0];
}

/* ─── Report row ─── */
function ReportRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-blue-accent/5 border border-blue-accent/10">
      <span className="text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/50">{label}</span>
      <span className="text-sm font-ui text-[#f0f4ff]">{value || <span className="text-silver/30 italic text-xs">Sin datos</span>}</span>
    </div>
  );
}

/* ─── Form field ─── */
function Field({ label, id, type = "text", value, onChange, placeholder }: {
  label: string; id: string; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ─── Password modal ─── */
function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const strength = strengthInfo(next);

  function reset() { setCurrent(""); setNext(""); setConfirm(""); setDone(false); setError(""); }

  function handleSubmit() {
    if (!current) { setError("Ingresa tu contraseña actual."); return; }
    if (next.length < 8) { setError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (next !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setDone(true); setError("");
  }

  function handleClose() { reset(); onClose(); }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-status-green" style={{ filter: "drop-shadow(0 0 8px #00e676)" }} />
            <p className="font-ui text-[#f0f4ff] font-semibold">Contraseña actualizada</p>
            <p className="text-sm text-silver/70">Los cambios se guardarán en tu próxima sesión.</p>
            <button onClick={handleClose} className="mt-2 px-6 py-2 rounded-lg bg-gradient-cta text-sm font-ui text-white">
              Cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            {/* Current password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pw-current">Contraseña actual</Label>
              <div className="relative">
                <Input id="pw-current" type={showCurrent ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" className="pr-10" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-silver/50 hover:text-silver transition-colors">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pw-new">Nueva contraseña</Label>
              <div className="relative">
                <Input id="pw-new" type={showNext ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} placeholder="••••••••" className="pr-10" />
                <button type="button" onClick={() => setShowNext(!showNext)} className="absolute right-3 top-1/2 -translate-y-1/2 text-silver/50 hover:text-silver transition-colors">
                  {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {next && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="h-1 rounded-full bg-navy-mid overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", strength.color)} style={{ width: `${strength.pct}%` }} />
                  </div>
                  <span className="text-[11px] font-ui text-silver/60">{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pw-confirm">Confirmar contraseña</Label>
              <Input id="pw-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            </div>

            {error && (
              <p className="flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}

            <div className="flex gap-3 mt-1">
              <button onClick={handleClose} className="flex-1 py-2.5 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white hover:bg-white/5 transition-all">
                Cancelar
              </button>
              <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui text-white hover:shadow-glow transition-all">
                Guardar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main panel ─── */
export default function PersonalDataPanel() {
  const { user } = useAuth(false);
  const { data, save, avatar, saveAvatar } = usePersonalData();
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState<PersonalData>(data);
  const [showPwModal, setShowPwModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const complete  = isProfileComplete(data);
  const pct       = completionPercent(data);
  const fullName  = [data.nombre, data.apellido].filter(Boolean).join(" ") || user?.name || "Usuario";
  const email     = data.correo || user?.email || "";

  function startEdit() { setDraft({ ...data }); setEditing(true); }
  function cancelEdit() { setEditing(false); }
  function commitEdit() { save(draft); setEditing(false); }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) saveAvatar(ev.target.result as string); };
    reader.readAsDataURL(file);
  }

  function field(k: keyof PersonalData) {
    return { value: draft[k], onChange: (v: string) => setDraft((p) => ({ ...p, [k]: v })) };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 max-w-4xl"
    >
      {/* ── Header card ── */}
      <div
        className="rounded-2xl border border-glass-bd p-6 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.4) 100%)" }}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full border-2 border-blue-accent/40 overflow-hidden flex items-center justify-center"
            style={{ background: "rgba(77,127,255,0.12)" }}>
            {avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              : <User className="w-9 h-9 text-blue-accent" />}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border border-glass-bd hover:bg-blue-accent/20 transition-colors"
            style={{ background: "rgba(8,14,26,0.9)" }}
            title="Cambiar foto"
          >
            <Camera className="w-3.5 h-3.5 text-silver" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-ui text-xl font-semibold text-[#f0f4ff] truncate">{fullName}</h2>
          <p className="text-sm text-silver mt-0.5 truncate">{email}</p>
          {/* Completion bar */}
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-ui">
              <span className="text-silver/60">Perfil completado</span>
              <span className={cn("font-semibold", complete ? "text-status-green" : "text-blue-accent")}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-mid overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-accent to-cyan"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-2">
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-accent/30 text-sm font-ui text-blue-accent hover:bg-blue-accent/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          <button
            onClick={() => setShowPwModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white hover:bg-white/5 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" /> Contraseña
          </button>
        </div>
      </div>

      {/* ── VIEW mode ── */}
      {!editing && (
        <div className="flex flex-col gap-4">
          <SectionHeader title="Datos Personales" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ReportRow label="Nombre"              value={data.nombre} />
            <ReportRow label="Apellido"             value={data.apellido} />
            <ReportRow label="Cédula / ID / Pasaporte" value={data.cedula} />
            <ReportRow label="Dir. Habitacional"   value={data.dirHab} />
            <ReportRow label="Dir. Empresarial"    value={data.dirEmp} />
          </div>

          <SectionHeader title="Teléfonos" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ReportRow label="Tel. Habitacional" value={data.telHab} />
            <ReportRow label="Tel. Empresarial"  value={data.telEmp} />
            <ReportRow label="Tel. Móvil"        value={data.telMov} />
          </div>

          <SectionHeader title="Datos Profesionales" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ReportRow label="Empresa"   value={data.empresa} />
            <ReportRow label="Cargo"     value={data.cargo} />
            <ReportRow label="Profesión" value={data.profesion} />
          </div>

          <SectionHeader title="Cuenta" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReportRow label="Correo electrónico" value={data.correo || user?.email} />
          </div>
        </div>
      )}

      {/* ── EDIT mode ── */}
      {editing && (
        <div className="flex flex-col gap-6">
          <SectionHeader title="Datos Personales" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre"   id="e-nombre"   {...field("nombre")}   placeholder="Juan" />
            <Field label="Apellido" id="e-apellido" {...field("apellido")} placeholder="Pérez" />
            <Field label="Cédula / ID / Pasaporte" id="e-cedula" {...field("cedula")} placeholder="V-12345678" />
            <Field label="Dir. Habitacional" id="e-dir-hab" {...field("dirHab")} placeholder="Calle, Ciudad" />
            <Field label="Dir. Empresarial"  id="e-dir-emp" {...field("dirEmp")} placeholder="Av. Principal, Oficina" />
          </div>

          <SectionHeader title="Teléfonos" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tel. Habitacional" id="e-tel-hab" {...field("telHab")} placeholder="+58 212 000 0000" />
            <Field label="Tel. Empresarial"  id="e-tel-emp" {...field("telEmp")} placeholder="+58 212 000 0000" />
            <Field label="Tel. Móvil"        id="e-tel-mov" {...field("telMov")} placeholder="+58 414 000 0000" />
          </div>

          <SectionHeader title="Datos Profesionales" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Empresa"   id="e-empresa"   {...field("empresa")}   placeholder="TechnoSoftware C.A." />
            <Field label="Cargo"     id="e-cargo"     {...field("cargo")}     placeholder="Gerente de Proyectos" />
            <Field label="Profesión" id="e-profesion" {...field("profesion")} placeholder="Ingeniero de Software" />
          </div>

          <SectionHeader title="Cuenta" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Correo electrónico" id="e-correo" type="email" {...field("correo")} placeholder="correo@empresa.com" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={cancelEdit} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-glass-bd text-sm font-ui text-silver hover:text-white hover:bg-white/5 transition-all">
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button onClick={commitEdit} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-cta text-sm font-ui text-white hover:shadow-glow transition-all">
              <Save className="w-4 h-4" /> Guardar cambios
            </button>
          </div>
        </div>
      )}

      <PasswordModal open={showPwModal} onClose={() => setShowPwModal(false)} />
    </motion.div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[10px] font-ui font-semibold uppercase tracking-widest text-silver/50">{title}</p>
      <div className="flex-1 h-px bg-glass-bd" />
    </div>
  );
}
