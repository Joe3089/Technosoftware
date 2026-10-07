"use client";

import { useState } from "react";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterForm({ onLogin }: { onLogin: () => void }) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSuccess(true);
    setTimeout(onLogin, 3000);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle className="w-12 h-12 text-status-green animate-pulse-glow" />
        <p className="text-[#f0f4ff] font-ui font-semibold">¡Cuenta creada!</p>
        <p className="text-sm text-silver">Revisa tu correo y activa tu cuenta. Redirigiendo…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-nombre">Nombre</Label>
          <Input id="reg-nombre" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Juan" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-apellido">Apellido</Label>
          <Input id="reg-apellido" name="apellido" value={form.apellido} onChange={handleChange} required placeholder="Pérez" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-email">Correo</Label>
        <Input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="email" placeholder="tu@correo.com" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-pw">Contraseña (mín. 8 caracteres)</Label>
        <div className="relative">
          <Input
            id="reg-pw"
            name="password"
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className="pr-10"
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-silver hover:text-white">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-confirm">Confirmar contraseña</Label>
        <Input id="reg-confirm" name="confirm" type="password" value={form.confirm} onChange={handleChange} required autoComplete="new-password" placeholder="••••••••" />
      </div>

      <Button type="submit" size="lg" className="w-full mt-1" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner />
            Creando cuenta…
          </span>
        ) : (
          <><UserPlus className="w-4 h-4" />CREAR CUENTA</>
        )}
      </Button>

      <p className="text-center text-sm text-silver">
        ¿Ya tienes cuenta?{" "}
        <button type="button" onClick={onLogin} className="text-blue-accent hover:underline font-ui font-semibold">
          Inicia sesión
        </button>
      </p>
    </form>
  );
}
