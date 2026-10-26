import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const allowedOrigins = (Deno.env.get("PLANWISE_ALLOWED_ORIGIN") || "*")
  .split(",")
  .map((value) => value.trim());
const corsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": allowedOrigins.includes("*")
    ? "*"
    : req.headers.get("Origin") && allowedOrigins.includes(req.headers.get("Origin")!)
      ? req.headers.get("Origin")!
      : "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});
serve(async (req) => {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: corsHeaders(req) });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = req.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!url || !anon || !service)
    return reply({ error: "Account deletion is not configured on the server." }, 503);
  if (!token) return reply({ error: "Sign in again before deleting your account." }, 401);
  const auth = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await auth.auth.getUser(token);
  if (error || !user) return reply({ error: "Your session is invalid. Sign in again." }, 401);
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: files, error: listError } = await admin.storage
    .from("avatars")
    .list(user.id, { limit: 1000 });
  if (listError)
    return reply({ error: "Could not check profile-photo storage before deletion." }, 500);
  if (files?.length) {
    const { error: removeError } = await admin.storage
      .from("avatars")
      .remove(files.map((f) => `${user.id}/${f.name}`));
    if (removeError)
      return reply({ error: "Could not remove profile photos. No account data was deleted." }, 500);
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError)
    return reply({ error: "Could not delete the account. Please contact support." }, 500);
  return reply({ ok: true });
});
