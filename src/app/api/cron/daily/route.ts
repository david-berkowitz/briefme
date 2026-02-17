import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { runWorkspaceDaily } from "@/lib/server/dailyRunner";

export const runtime = "nodejs";

const sendSignupSummaryEmail = async (
  signups: Array<{ email: string; created_at: string }>,
  periodStartIso: string
) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL;
  const reportEmail = process.env.ADMIN_REPORT_EMAIL;

  if (!apiKey || !fromEmail || !reportEmail) {
    return { sent: false, reason: "Missing email config." };
  }

  const periodLabel = `${new Date(periodStartIso).toLocaleString()} to ${new Date().toLocaleString()}`;
  const listHtml =
    signups.length === 0
      ? "<li>No new signups in this period.</li>"
      : signups
          .map(
            (signup) =>
              `<li><strong>${signup.email}</strong> <span style=\"color:#64748b;\">(${new Date(
                signup.created_at
              ).toLocaleString()})</span></li>`
          )
          .join("");

  const html = `
    <h2>BriefMe beta signups: daily summary</h2>
    <p>Window: ${periodLabel}</p>
    <p>Total new signups: <strong>${signups.length}</strong></p>
    <ul>${listHtml}</ul>
    <p><a href=\"${process.env.NEXT_PUBLIC_SITE_URL ?? "https://briefme.info"}/dashboard\">Open dashboard</a></p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [reportEmail],
      subject: `BriefMe beta signups (${signups.length})`,
      html
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown email error");
    return { sent: false, reason: text };
  }

  return { sent: true, reason: null };
};

export async function POST(request: Request) {
  const secret = process.env.ADMIN_REPORT_SECRET;
  const incoming = request.headers.get("x-admin-secret");

  if (!secret || incoming !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Missing server config" }, { status: 500 });
  }

  const db = supabase as any;
  const { data: workspaces, error } = await db.from("workspaces").select("id,name,owner_email");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let workspacesProcessed = 0;
  let totalPosts = 0;
  let totalBriefs = 0;
  let totalEmails = 0;
  let signupSummarySent = false;
  let newSignups = 0;
  const failures: Array<{ workspace_id: string; message: string }> = [];

  for (const workspace of workspaces ?? []) {
    const startedAt = new Date().toISOString();

    try {
      const result = await runWorkspaceDaily(db, workspace);
      totalPosts += result.postsInserted;
      totalBriefs += result.briefsCreated;
      totalEmails += result.emailsSent;
      workspacesProcessed += 1;

      await db.from("daily_run_logs").insert({
        workspace_id: workspace.id,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        status: "success",
        posts_inserted: result.postsInserted,
        briefs_created: result.briefsCreated,
        emails_sent: result.emailsSent,
        error_message: null
      });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Unknown daily-run error";
      failures.push({ workspace_id: workspace.id, message });

      await db.from("daily_run_logs").insert({
        workspace_id: workspace.id,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        status: "failed",
        posts_inserted: 0,
        briefs_created: 0,
        emails_sent: 0,
        error_message: message
      });
    }
  }

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSignups } = await db
    .from("beta_signups")
    .select("email,created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  const signupRows = (recentSignups ?? []) as Array<{ email: string; created_at: string }>;
  newSignups = signupRows.length;
  const signupMail = await sendSignupSummaryEmail(signupRows, sinceIso);
  signupSummarySent = signupMail.sent;

  return NextResponse.json({
    workspacesProcessed,
    totalPosts,
    totalBriefs,
    totalEmails,
    newSignups,
    signupSummarySent,
    failures
  });
}
