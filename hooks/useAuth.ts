"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  email: string;
  name: string;
}

export function useAuth(redirectIfUnauthenticated = true) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = sessionStorage.getItem("ts_user_email");
    const name = sessionStorage.getItem("ts_user_name") ?? email ?? "";

    if (!email) {
      if (redirectIfUnauthenticated) router.replace("/login");
      setLoading(false);
      return;
    }

    setUser({ email, name });
    setLoading(false);
  }, [router, redirectIfUnauthenticated]);

  function login(email: string, name?: string) {
    sessionStorage.setItem("ts_user_email", email);
    sessionStorage.setItem("ts_user_name", name ?? email.split("@")[0]);
    setUser({ email, name: name ?? email.split("@")[0] });
    router.push("/dashboard");
  }

  function logout() {
    sessionStorage.removeItem("ts_user_email");
    sessionStorage.removeItem("ts_user_name");
    setUser(null);
    router.push("/login");
  }

  return { user, loading, login, logout };
}
