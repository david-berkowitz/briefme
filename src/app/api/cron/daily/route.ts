import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { runWorkspaceDaily } from "@/lib/server/dailyRunner";

export const runtime = "nodejs";

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

  return NextResponse.json({
    workspacesProcessed,
    totalPosts,
    totalBriefs,
    totalEmails,
    failures
  });
}
