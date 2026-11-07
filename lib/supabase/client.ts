import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLIC_KEY } from "./keys";

export function createClient() {
  return createBrowserClient(
    // Placeholders keep the static build working before the env vars are configured
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_PUBLIC_KEY || "placeholder-anon-key"
  );
}
