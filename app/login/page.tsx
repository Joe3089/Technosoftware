import AuthCard from "@/components/auth/AuthCard";

export const metadata = {
  title: "Acceder — Technosoftware",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-navy-deep">
      {/* Orbs decorativos */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,207,255,0.15) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(77,127,255,0.12) 0%, transparent 70%)",
        }}
      />
      <AuthCard />
    </main>
  );
}
