"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Calendar, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ScrollReveal from "@/components/common/ScrollReveal";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const GoogleMap = dynamic(() => import("@/components/common/GoogleMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl border border-glass-bd bg-navy-mid/40 flex items-center justify-center" style={{ height: 320 }}>
      <LoadingSpinner />
    </div>
  ),
});

/* ─── Main section ─── */
export default function ContactSection() {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "" });
  const [showMap, setShowMap] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ nombre: "", email: "", mensaje: "" });
    }, 6000);
  }

  return (
    <section id="contacto" className="relative py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <ScrollReveal className="text-center mb-16">
          <span className="eyebrow mb-4 block">Contacto</span>
          <h2 className="font-display text-[#f0f4ff]" style={{ fontSize: "var(--fs-title)" }}>
            HABLEMOS DE TU{" "}
            <span className="text-gradient">PROYECTO</span>
          </h2>
          <p className="mt-4 text-silver max-w-2xl mx-auto">
            Agenda una consultoría gratuita y recibe una propuesta personalizada en menos de 48 horas.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info column */}
          <ScrollReveal delay={100}>
            <div className="flex flex-col gap-6">
              {[
                {
                  icon: MapPin, color: "blue-accent",
                  title: "Ubicación",
                  body: "Operamos remotamente · Disponibles en 15+ países",
                },
                {
                  icon: Calendar, color: "status-green",
                  title: "Horario (VET UTC-4)",
                  body: "Lunes a Viernes · 9:00 — 17:00",
                  sub: "Respuesta en menos de 2 horas hábiles",
                },
              ].map(({ icon: Icon, color, title, body, sub }) => (
                <div key={title} className="glass-card rounded-xl p-6 flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-${color}/10 border border-${color}/20 shrink-0`}>
                    <Icon className={`w-5 h-5 text-${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-ui font-semibold text-[#f0f4ff] mb-1">{title}</h4>
                    <p className="text-sm text-silver">{body}</p>
                    {sub && <p className="text-xs text-silver/50 mt-1">{sub}</p>}
                    {title === "Ubicación" && (
                      <button
                        onClick={() => setShowMap(true)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-ui text-blue-accent hover:underline"
                      >
                        <MapPin className="w-3 h-3" /> Ver en mapa
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Form */}
          <ScrollReveal delay={200}>
            {sent ? (
              <div className="glass-card rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center min-h-[360px]">
                <CheckCircle className="w-16 h-16 text-status-green" style={{ filter: "drop-shadow(0 0 12px #00e676)" }} />
                <h3 className="font-ui font-semibold text-xl text-[#f0f4ff]">¡Mensaje enviado!</h3>
                <p className="text-silver text-sm">Te contactaremos en menos de 48 horas hábiles.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="glass-card rounded-xl p-8 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Tu nombre" autoComplete="name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="tu@correo.com" autoComplete="email" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mensaje">Mensaje *</Label>
                  <textarea
                    id="mensaje"
                    name="mensaje"
                    value={form.mensaje}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="¿En qué podemos ayudarte?"
                    className="flex w-full rounded-lg border border-glass-bd bg-[rgba(5,9,26,0.5)] px-3 py-2 text-sm text-[#f0f4ff] font-body placeholder:text-silver/50 transition-all duration-300 focus:outline-none focus:border-blue-accent focus:shadow-[0_0_0_3px_rgba(77,127,255,0.12)] resize-none"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full mt-1" disabled={sending}>
                  {sending ? (
                    <span className="flex items-center gap-2"><LoadingSpinner />Enviando…</span>
                  ) : (
                    <><Send className="w-4 h-4 mr-1" />Contáctanos</>
                  )}
                </Button>
              </form>
            )}
          </ScrollReveal>
        </div>
      </div>

      {/* Google Maps modal */}
      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Selecciona tu ubicación</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-silver/60 -mt-1 mb-2">
            Haz clic en el mapa para fijar una ubicación o arrastra el marcador para ajustar.
          </p>
          <GoogleMap />
        </DialogContent>
      </Dialog>
    </section>
  );
}
