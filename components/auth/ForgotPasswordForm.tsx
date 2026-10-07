"use client";

import { useState } from "react";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle className="w-12 h-12 text-status-green animate-pulse-glow" />
        <p className="text-[#f0f4ff] font-ui font-semibold">¡Enlace enviado!</p>
        <p className="text-sm text-silver">
          Revisa tu bandeja de entrada en <span className="text-blue-accent">{email}</span>.
        </p>
        <button onClick={onBack} className="text-sm text-silver hover:text-white transition-colors font-ui mt-2">
          ← Volver al login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-silver hover:text-white transition-colors font-ui w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      <div>
        <p className="text-sm text-silver mb-4">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-email">Correo electrónico</Label>
        <Input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tu@correo.com"
          autoComplete="email"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner />
            Enviando…
          </span>
        ) : (
          <><Send className="w-4 h-4" />ENVIAR ENLACE</>
        )}
      </Button>
    </form>
  );
}
