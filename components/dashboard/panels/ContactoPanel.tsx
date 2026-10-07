"use client";

import { motion } from "framer-motion";
import { MessageSquare, Calendar, PlusCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ContactoPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 max-w-4xl"
    >
      <div>
        <h2 className="font-ui text-xl font-semibold text-[#f0f4ff]">Contáctanos</h2>
        <p className="text-sm text-silver mt-1">Solicita una consultoría o inicia un nuevo proyecto.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Consultoría */}
        <div className="rounded-2xl border border-glass-bd p-6 flex flex-col gap-4 hover:border-status-green/40 transition-colors"
          style={{ background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(0,50,30,0.3) 100%)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-status-green/20"
            style={{ background: "rgba(0,230,118,0.08)" }}>
            <Calendar className="w-5 h-5 text-status-green" />
          </div>
          <div>
            <h3 className="font-ui font-semibold text-[#f0f4ff]">Agendar Consultoría</h3>
            <p className="text-sm text-silver mt-1">Reserva una sesión gratuita de 30 minutos con nuestro equipo.</p>
          </div>
          <Link href="/#contacto"
            className="mt-auto flex items-center gap-2 text-sm font-ui text-status-green hover:underline">
            Agendar ahora <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Nuevo proyecto */}
        <div className="rounded-2xl border border-glass-bd p-6 flex flex-col gap-4 hover:border-blue-accent/40 transition-colors"
          style={{ background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(30,53,115,0.4) 100%)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-blue-accent/20"
            style={{ background: "rgba(77,127,255,0.08)" }}>
            <PlusCircle className="w-5 h-5 text-blue-accent" />
          </div>
          <div>
            <h3 className="font-ui font-semibold text-[#f0f4ff]">Nuevo Proyecto</h3>
            <p className="text-sm text-silver mt-1">Cuéntanos sobre tu idea y recibe una propuesta personalizada.</p>
          </div>
          <Link href="/#contacto"
            className="mt-auto flex items-center gap-2 text-sm font-ui text-blue-accent hover:underline">
            Enviar solicitud <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Support */}
      <div className="rounded-2xl border border-glass-bd p-6 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg, rgba(21,32,64,0.9) 0%, rgba(0,60,80,0.3) 100%)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-cyan/20 shrink-0"
          style={{ background: "rgba(0,207,255,0.08)" }}>
          <MessageSquare className="w-5 h-5 text-cyan" />
        </div>
        <div className="flex-1">
          <h3 className="font-ui font-semibold text-[#f0f4ff]">Soporte directo</h3>
          <p className="text-sm text-silver mt-0.5">hola@technosoftware.mx · Respuesta en menos de 2 horas hábiles</p>
        </div>
      </div>
    </motion.div>
  );
}
