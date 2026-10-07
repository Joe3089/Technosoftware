"use client";

import { useState } from "react";
import { Eye, EyeOff, LogIn, AlertCircle, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

export default function LoginForm({
  onForgot,
  onRegister,
}: {
  onForgot: () => void;
  onRegister: () => void;
}) {
  const { login } = useAuth(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    setLoading(true);
    const err = await login(email.trim(), password);
    if (err) {
      setError(err);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Correo electrónico</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="tu@correo.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-pw">Contraseña</Label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-blue-accent hover:underline font-ui"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div className="relative">
          <Input
            id="login-pw"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-silver hover:text-white transition-colors"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner />
            Accediendo…
          </span>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            ACCEDER
          </>
        )}
      </Button>

      <div className="relative flex items-center gap-3 text-silver/40">
        <div className="flex-1 h-px bg-glass-bd" />
        <span className="text-xs font-ui">o continúa con</span>
        <div className="flex-1 h-px bg-glass-bd" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-glass-bd text-silver hover:border-blue-accent/40 hover:text-white transition-all text-sm font-ui"
        >
          <Chrome className="w-4 h-4" />
          Google
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-glass-bd text-silver hover:border-blue-accent/40 hover:text-white transition-all text-sm font-ui"
        >
          <span className="font-bold text-xs">⊞</span>
          Microsoft
        </button>
      </div>

      <p className="text-center text-sm text-silver">
        ¿No tienes cuenta?{" "}
        <button
          type="button"
          onClick={onRegister}
          className="text-blue-accent hover:underline font-ui font-semibold"
        >
          Regístrate
        </button>
      </p>
    </form>
  );
}
