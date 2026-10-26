import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("PLANWISE_ALLOWED_ORIGIN") || "*")
  .split(",")
  .map((value) => value.trim());
const corsHeaders = (request: Request) => ({
  "Access-Control-Allow-Origin": allowedOrigins.includes("*")
    ? "*"
    : request.headers.get("Origin") && allowedOrigins.includes(request.headers.get("Origin")!)
      ? request.headers.get("Origin")!
      : "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});

serve(async (request) => {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: corsHeaders(request) });
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!url || !anon || !service)
    return reply({ error: "Admin management is not configured." }, 503);
  if (!token) return reply({ error: "Sign in to continue." }, 401);

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(token);
  if (authError || !user) return reply({ error: "Your session has expired. Sign in again." }, 401);
  const { data: allowed, error: roleError } = await userClient.rpc("is_planwisely_admin");
  if (roleError || !allowed)
    return reply({ error: "Verified admin access with MFA is required." }, 403);

  let body: { action?: unknown; reason?: unknown; userId?: unknown; active?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Invalid request body." }, 400);
  }
  const action = body.action;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason || reason.length > 500)
    return reply({ error: "Provide an audit reason of 1–500 characters." }, 400);
  const serviceClient = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (action === "list") {
      const { error: auditError } = await userClient.rpc("log_admin_action", {
        p_action: "view_student_roster",
        p_subject_user_id: null,
        p_reason: reason,
        p_details: {},
      });
      if (auditError) throw auditError;
      const allUsers: Array<{
        id: string;
        email?: string;
        created_at?: string;
        banned_until?: string | null;
      }> = [];
      for (let page = 1; page <= 100; page++) {
        const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        allUsers.push(
          ...data.users.map((item) => ({
            id: item.id,
            email: item.email,
            created_at: item.created_at,
            banned_until: item.banned_until,
          })),
        );
        if (data.users.length < 1000) break;
      }
      const ids = allUsers.map((item) => item.id);
      const profiles = ids.length
        ? await serviceClient
            .from("profiles")
            .select("id,full_name,university,study_year")
            .in("id", ids)
        : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      const profileMap = new Map((profiles.data || []).map((profile) => [profile.id, profile]));
      const students = allUsers.map((account) => ({
        ...profileMap.get(account.id),
        id: account.id,
        email: account.email || "",
        createdAt: account.created_at || "",
        bannedUntil: account.banned_until || null,
      }));
      return reply({ students });
    }

    if (action === "status") {
      const targetId = typeof body.userId === "string" ? body.userId : "";
      if (!/^[0-9a-f-]{36}$/i.test(targetId) || typeof body.active !== "boolean")
        return reply({ error: "A valid user and account status are required." }, 400);
      if (targetId === user.id)
        return reply({ error: "You cannot change your own admin account status here." }, 400);
      const { data: targetAdmin, error: targetError } = await serviceClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", targetId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (targetAdmin)
        return reply({ error: "Admin accounts cannot be suspended from student management." }, 400);
      const { error: auditError } = await userClient.rpc("log_admin_action", {
        p_action: body.active ? "reactivate_student" : "suspend_student",
        p_subject_user_id: targetId,
        p_reason: reason,
        p_details: {},
      });
      if (auditError) throw auditError;
      const { error } = await serviceClient.auth.admin.updateUserById(targetId, {
        ban_duration: body.active ? "none" : "876000h",
      });
      if (error) throw error;
      return reply({ ok: true });
    }
    return reply({ error: "Unsupported admin action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin operation failed.";
    return reply({ error: message }, 500);
  }
});
