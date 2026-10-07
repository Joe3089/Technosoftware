import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    // Placeholders keep the static build working before the env vars are configured
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
  );
}
