import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { Field, TextArea } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { getSupabase } from "@/lib/supabase";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/admin")({
  head: () =>
    pwHead("Admin dashboard — PlanWisely", "Manage support requests and educational content."),
  component: AdminPage,
});
type Support = {
  id: string;
  user_id: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  admin_reply: string | null;
  created_at: string;
};
type Content = {
  id: string;
  kind: "tip" | "guide";
  title: string;
  body: string;
  category: string;
  risk_level: string | null;
  published: boolean;
};
type Student = {
  id: string;
  email: string;
  full_name?: string;
  university?: string;
  study_year?: string;
  createdAt: string;
  bannedUntil: string | null;
};

function AdminPage() {
  const { isAdmin, userId } = useApp();
  const [supports, setSupports] = useState<Support[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [content, setContent] = useState<Content[]>([]);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [reason, setReason] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Content | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"tip" | "guide">("tip");
  const [category, setCategory] = useState("budgeting");
  const [risk, setRisk] = useState("low");
  const [busy, setBusy] = useState(false);
  const [mfaLevel, setMfaLevel] = useState<"checking" | "required" | "aal2">("checking");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let alive = true;
    void getSupabase()
      .auth.mfa.getAuthenticatorAssuranceLevel()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          toast.error(error.message);
          setMfaLevel("required");
          return;
        }
        if (data.currentLevel === "aal2") {
          setMfaLevel("aal2");
          return;
        }
        setMfaLevel("required");
      });
    return () => {
      alive = false;
    };
  }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin || mfaLevel !== "aal2") return;
    const stated =
      window.prompt("State why you need to review the admin support and system records.")?.trim() ||
      "";
    if (!stated) return;
    setReason(stated);
    setAuthorized(true);
  }, [isAdmin, mfaLevel]);
  const beginMfa = async () => {
    setBusy(true);
    try {
      const auth = getSupabase().auth;
      const listed = await auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      const verified = listed.data.totp.find((factor) => factor.status === "verified");
      let id = verified?.id;
      if (!id) {
        const enrolled = await auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "PlanWisely admin",
        });
        if (enrolled.error) throw enrolled.error;
        id = enrolled.data.id;
        setQrCode(enrolled.data.totp.qr_code);
      }
      setFactorId(id);
      const challenge = await auth.mfa.challenge({ factorId: id });
      if (challenge.error) throw challenge.error;
      setChallengeId(challenge.data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start admin MFA setup.");
    } finally {
      setBusy(false);
    }
  };
  const verifyMfa = async () => {
    if (!factorId || !challengeId || !/^\d{6}$/.test(mfaCode)) {
      toast.error("Enter the 6-digit authenticator code.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.mfa.verify({
        factorId,
        challengeId,
        code: mfaCode,
      });
      if (error) throw error;
      const { data } = await getSupabase().auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel !== "aal2")
        throw new Error("MFA verification did not reach the required security level.");
      setMfaLevel("aal2");
      setQrCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not verify MFA code.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!authorized || !isAdmin) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const db = getSupabase();
        const { error: accessError } = await db.rpc("log_admin_action", {
          p_action: "view_support_inbox",
          p_subject_user_id: null,
          p_reason: reason,
          p_details: {},
        });
        if (accessError) throw accessError;
        const [s, c, w, roster] = await Promise.all([
          db
            .from("support_requests")
            .select("id,user_id,message,status,admin_reply,created_at")
            .order("created_at", { ascending: false })
            .limit(100),
          db
            .from("educational_content")
            .select("id,kind,title,body,category,risk_level,published")
            .order("updated_at", { ascending: false }),
          db
            .from("workflow_runs")
            .select("workflow,status,processed_count,error_message,started_at,finished_at")
            .order("started_at", { ascending: false })
            .limit(20),
          db.functions.invoke("admin-students", { body: { action: "list", reason } }),
        ]);
        const error = s.error || c.error || w.error || roster.error;
        if (error) throw error;
        if (roster.data?.error) throw new Error(roster.data.error);
        if (alive) {
          setSupports((s.data || []) as Support[]);
          setStudents((roster.data?.students || []) as Student[]);
          setContent((c.data || []) as Content[]);
          setRuns((w.data || []) as Array<Record<string, unknown>>);
          for (const item of s.data || []) {
            const { error: auditError } = await db.rpc("log_admin_action", {
              p_action: "view_support_request",
              p_subject_user_id: item.user_id,
              p_reason: reason,
              p_details: { request_id: item.id },
            });
            if (auditError) throw auditError;
          }
        }
      } catch (e) {
        if (alive) toast.error(e instanceof Error ? e.message : "Could not load admin records.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authorized, isAdmin, reason]);
  const log = async (
    action: string,
    subject: string | null,
    why: string,
    details: Record<string, unknown> = {},
  ) => {
    const { error } = await getSupabase().rpc("log_admin_action", {
      p_action: action,
      p_subject_user_id: subject,
      p_reason: why,
      p_details: details,
    });
    if (error) throw error;
  };
  const updateSupport = async (item: Support, patch: Partial<Support>) => {
    const why = window.prompt("Why are you updating this support request?")?.trim();
    if (!why) return;
    setBusy(true);
    try {
      await log("update_support_request", item.user_id, why, {
        request_id: item.id,
        status: patch.status,
      });
      const { error } = await getSupabase()
        .from("support_requests")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw error;
      setSupports((old) => old.map((x) => (x.id === item.id ? { ...x, ...patch } : x)));
      toast.success("Support request updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update request.");
    } finally {
      setBusy(false);
    }
  };
  const reply = async (item: Support) => {
    const message = window.prompt("Write a reply to the student.")?.trim();
    if (!message) return;
    const why = window.prompt("State the reason for this reply for the audit log.")?.trim();
    if (!why) return;
    setBusy(true);
    try {
      await log("reply_to_support_request", item.user_id, why, { request_id: item.id });
      const { error: replyError } = await getSupabase()
        .from("support_replies")
        .insert({ request_id: item.id, admin_id: userId, message });
      if (replyError) throw replyError;
      const { error } = await getSupabase()
        .from("support_requests")
        .update({
          admin_reply: message,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw error;
      setSupports((old) =>
        old.map((x) =>
          x.id === item.id ? { ...x, admin_reply: message, status: "in_progress" } : x,
        ),
      );
      toast.success("Reply saved. The student will see it in Help & Support.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the reply.");
    } finally {
      setBusy(false);
    }
  };
  const changeStudentStatus = async (student: Student) => {
    const active = Boolean(student.bannedUntil);
    const why = window
      .prompt(`State why you want to ${active ? "reactivate" : "suspend"} ${student.email}.`)
      ?.trim();
    if (!why) return;
    setBusy(true);
    try {
      const { data, error } = await getSupabase().functions.invoke("admin-students", {
        body: { action: "status", userId: student.id, active, reason: why },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStudents((old) =>
        old.map((item) =>
          item.id === student.id
            ? {
                ...item,
                bannedUntil: active
                  ? null
                  : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
              }
            : item,
        ),
      );
      toast.success(active ? "Account reactivated." : "Account suspended.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the account.");
    } finally {
      setBusy(false);
    }
  };
  const resetContent = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setKind("tip");
    setCategory("budgeting");
    setRisk("low");
  };
  const saveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and content.");
      return;
    }
    const why = window
      .prompt(`State why you want to ${editing ? "edit" : "create"} this educational content.`)
      ?.trim();
    if (!why) return;
    setBusy(true);
    try {
      await log(editing ? "edit_educational_content" : "create_educational_content", null, why, {
        content_id: editing?.id || null,
        title: title.trim(),
      });
      const row = {
        kind,
        title: title.trim(),
        body: body.trim(),
        category,
        risk_level: kind === "guide" ? risk : null,
        created_by: userId,
        updated_at: new Date().toISOString(),
      };
      const result = editing
        ? await getSupabase()
            .from("educational_content")
            .update(row)
            .eq("id", editing.id)
            .select()
            .single()
        : await getSupabase().from("educational_content").insert(row).select().single();
      if (result.error) throw result.error;
      setContent((old) =>
        editing
          ? old.map((x) => (x.id === editing.id ? (result.data as Content) : x))
          : [result.data as Content, ...old],
      );
      resetContent();
      toast.success("Educational content saved as a draft.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save content.");
    } finally {
      setBusy(false);
    }
  };
  const editContent = (item: Content) => {
    setEditing(item);
    setTitle(item.title);
    setBody(item.body);
    setKind(item.kind);
    setCategory(item.category);
    setRisk(item.risk_level || "low");
  };
  const togglePublished = async (item: Content) => {
    const why = window
      .prompt(`State why you want to ${item.published ? "unpublish" : "publish"} this content.`)
      ?.trim();
    if (!why) return;
    try {
      await log(
        item.published ? "unpublish_educational_content" : "publish_educational_content",
        null,
        why,
        { content_id: item.id, title: item.title },
      );
      const { error } = await getSupabase()
        .from("educational_content")
        .update({ published: !item.published, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw error;
      setContent((old) =>
        old.map((x) => (x.id === item.id ? { ...x, published: !x.published } : x)),
      );
      toast.success(item.published ? "Content unpublished." : "Content published.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update content.");
    }
  };
  const deleteContent = async (item: Content) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    const why = window.prompt("State why you want to delete this content.")?.trim();
    if (!why) return;
    try {
      await log("delete_educational_content", null, why, {
        content_id: item.id,
        title: item.title,
      });
      const { error } = await getSupabase().from("educational_content").delete().eq("id", item.id);
      if (error) throw error;
      setContent((old) => old.filter((x) => x.id !== item.id));
      toast.success("Content deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete content.");
    }
  };
  if (!isAdmin)
    return (
      <Page className="min-h-dvh">
        <PageHeader title="Admin dashboard" backTo="/dashboard" />
        <div className="rounded-2xl bg-card p-5 text-center">
          <h2 className="font-bold">Admin access required</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This account is not authorised to manage PlanWisely.
          </p>
        </div>
      </Page>
    );
  if (mfaLevel !== "aal2")
    return (
      <Page className="min-h-dvh">
        <PageHeader title="Admin security" backTo="/dashboard" />
        <div className="rounded-2xl bg-card p-5 shadow-soft">
          <h2 className="font-extrabold text-foreground">Authenticator verification required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin records require multi-factor authentication. Scan the QR code with an
            authenticator app, then enter its current six-digit code.
          </p>
          {qrCode && (
            <img
              src={qrCode}
              alt="Authenticator setup QR code"
              className="mx-auto my-4 h-48 w-48"
            />
          )}
          {factorId && challengeId ? (
            <div className="mt-4 space-y-3">
              <Field
                label="6-digit code"
                value={mfaCode}
                onChange={setMfaCode}
                placeholder="000000"
              />
              <button
                disabled={busy}
                onClick={() => void verifyMfa()}
                className="w-full rounded-xl bg-navy p-3 font-bold text-navy-foreground disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Verify code"}
              </button>
            </div>
          ) : (
            <button
              disabled={busy || mfaLevel === "checking"}
              onClick={() => void beginMfa()}
              className="mt-4 w-full rounded-xl bg-navy p-3 font-bold text-navy-foreground disabled:opacity-50"
            >
              {busy ? "Preparing…" : "Set up or verify authenticator"}
            </button>
          )}
        </div>
      </Page>
    );
  if (!authorized)
    return (
      <Page className="min-h-dvh">
        <PageHeader title="Admin dashboard" backTo="/dashboard" />
        <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
          A reason is required before opening admin records. Return to the menu and try again.
        </p>
      </Page>
    );
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Admin dashboard" left="menu" />
      <p className="mb-4 rounded-2xl bg-warning/10 p-3 text-xs text-muted-foreground">
        Admin records are sensitive. Every support-record view and update is written to the audit
        log. Student financial records are not exposed on this screen.
      </p>
      {loading ? (
        <div className="rounded-2xl bg-card p-5 text-sm">Loading admin records…</div>
      ) : (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-extrabold">Student accounts</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              This view contains contact and study details only; financial records are not available
              to admins.
            </p>
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search name, email or university"
              aria-label="Search students"
              className="mb-3 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
            />
            <div className="space-y-2">
              {students
                .filter((student) =>
                  `${student.full_name || ""} ${student.email} ${student.university || ""}`
                    .toLowerCase()
                    .includes(studentSearch.toLowerCase()),
                )
                .map((student) => (
                  <article key={student.id} className="rounded-2xl bg-card p-4 shadow-soft">
                    <p className="font-bold text-foreground">{student.full_name || "Student"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {student.email} · {student.university || "University not provided"} ·{" "}
                      {student.study_year || "Study year not provided"}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${student.bannedUntil ? "text-destructive" : "text-success"}`}
                      >
                        {student.bannedUntil ? "Suspended" : "Active"}
                      </span>
                      <button
                        disabled={busy}
                        onClick={() => void changeStudentStatus(student)}
                        className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"
                      >
                        {student.bannedUntil ? "Reactivate" : "Suspend"}
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            {students.length === 0 && (
              <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">
                No accounts were returned.
              </p>
            )}
          </section>
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-extrabold">
              Support requests ({supports.filter((x) => x.status !== "resolved").length} open)
            </h2>
            {supports.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">
                No support requests yet.
              </p>
            ) : (
              <div className="space-y-3">
                {supports.map((s) => (
                  <article key={s.id} className="rounded-2xl bg-card p-4 shadow-soft">
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {s.created_at.slice(0, 16).replace("T", " ")} · {s.status}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{s.message}</p>
                    {s.admin_reply && (
                      <p className="mt-2 rounded-xl bg-primary/8 p-3 text-xs">
                        <strong>Latest reply:</strong> {s.admin_reply}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        disabled={busy}
                        onClick={() => void reply(s)}
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                      >
                        Reply
                      </button>
                      <select
                        aria-label="Support request status"
                        value={s.status}
                        disabled={busy}
                        onChange={(e) =>
                          void updateSupport(s, { status: e.target.value as Support["status"] })
                        }
                        className="rounded-lg border border-border bg-background px-2 text-xs"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-extrabold">Financial learning content</h2>
            <form
              onSubmit={saveContent}
              className="mb-3 space-y-3 rounded-2xl bg-card p-4 shadow-soft"
            >
              <Field label="Title" value={title} onChange={setTitle} placeholder="Content title" />
              <TextArea
                label="Content"
                value={body}
                onChange={setBody}
                placeholder="Write clear educational content…"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold">
                  Type
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as "tip" | "guide")}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-3"
                  >
                    <option value="tip">Tip</option>
                    <option value="guide">Investment guide</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-3"
                  >
                    <option value="budgeting">Budgeting</option>
                    <option value="saving">Saving</option>
                    <option value="investing">Investing education</option>
                  </select>
                </label>
              </div>
              {kind === "guide" && (
                <label className="block text-xs font-semibold">
                  Risk level
                  <select
                    value={risk}
                    onChange={(e) => setRisk(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background p-3"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              )}
              <p className="text-[11px] text-muted-foreground">
                Guides are educational, not financial advice. New content is saved as a draft.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  className="flex-1 rounded-xl bg-navy p-3 text-sm font-bold text-navy-foreground"
                >
                  {editing ? "Save changes" : "Create draft"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={resetContent}
                    className="rounded-xl border border-border px-3 text-sm"
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
            <div className="space-y-2">
              {content.map((c) => (
                <article key={c.id} className="rounded-2xl bg-card p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">{c.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.kind} · {c.category} · {c.published ? "Published" : "Draft"}
                        {c.risk_level ? ` · ${c.risk_level} risk` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => editContent(c)}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void togglePublished(c)}
                      className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary"
                    >
                      {c.published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => void deleteContent(c)}
                      className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-extrabold">Scheduled workflow runs</h2>
            {runs.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">
                No workflow runs have been recorded.
              </p>
            ) : (
              <div className="space-y-2">
                {runs.map((r, i) => (
                  <div key={i} className="rounded-xl bg-card p-3 text-xs">
                    <strong>{String(r["workflow"])}</strong> · {String(r["status"])} ·{" "}
                    {String(r["started_at"])}
                    {Boolean(r["error_message"]) && (
                      <p className="mt-1 text-destructive">{String(r["error_message"])}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </Page>
  );
}
