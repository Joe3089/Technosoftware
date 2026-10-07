"use client";

import { useState } from "react";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";

type View = "login" | "register" | "forgot";

export default function AuthCard() {
  const [view, setView] = useState<View>("login");

  return (
    <div
      className="w-full max-w-md mx-4 relative z-10 animate-fade-up"
      style={{
        background: "rgba(11,21,53,0.65)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(77,127,255,0.2)",
        borderRadius: "1.25rem",
        boxShadow: "0 30px 80px rgba(0,0,0,0.4), 0 0 60px rgba(77,127,255,0.06)",
      }}
    >
      <div className="p-8">
        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image
            src="/logo.png"
            alt="Technosoftware"
            width={56}
            height={56}
            className="animate-spin-3d-slow drop-shadow-[0_0_16px_rgba(77,127,255,0.6)]"
          />
          <div className="text-center">
            <span className="font-ui font-bold text-2xl text-[#f0f4ff] tracking-wider block">
              TECHNOSOFTWARE
            </span>
            <span className="text-xs font-ui text-silver uppercase tracking-widest">
              Portal de Cliente
            </span>
          </div>
        </div>

        {view === "forgot" ? (
          <ForgotPasswordForm onBack={() => setView("login")} />
        ) : (
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList className="mb-6">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm
                onForgot={() => setView("forgot")}
                onRegister={() => setView("register")}
              />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm onLogin={() => setView("login")} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
