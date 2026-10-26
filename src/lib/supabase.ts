import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"]?.trim();
const key =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
  import.meta.env["VITE_SUPABASE_ANON_KEY"]?.trim();

export const isSupabaseConfigured = Boolean(url && key);
let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!isSupabaseConfigured)
    throw new Error(
      "Add your Supabase URL and publishable key to .env.local to connect PlanWisely.",
    );
  if (!client)
    client = createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  return client;
}

export function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PW"
  );
}
