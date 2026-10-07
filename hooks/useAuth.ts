"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Role = "admin" | "user";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

const ERRORS: Record<string, string> = {
  "Invalid login credentials": "Credenciales incorrectas. Verifica tu email y contraseña.",
  "Email not confirmed": "Debes confirmar tu correo antes de iniciar sesión.",
  "User already registered": "Ya existe una cuenta con ese correo.",
};
const translate = (msg: string) => ERRORS[msg] ?? msg;

export function useAuth(redirectIfUnauthenticated = true) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!active) return;
      if (!u) {
        setUser(null);
        setLoading(false);
        if (redirectIfUnauthenticated) router.replace("/login");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", u.id).single();
      if (!active) return;
      setUser({
        id: u.id,
        email: u.email ?? "",
        name: profile?.full_name ?? u.email?.split("@")[0] ?? "",
        role: (profile?.role ?? "user") as Role,
      });
      setLoading(false);
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") load();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, router, redirectIfUnauthenticated]);

  /** Returns an error message, or null on success (then redirects to /dashboard). */
  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return translate(error.message);
    router.push("/dashboard");
    router.refresh();
    return null;
  }

  async function register(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/login` },
    });
    return error ? translate(error.message) : null;
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return error ? translate(error.message) : null;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  return { user, loading, isAdmin: user?.role === "admin", login, register, resetPassword, logout };
}
