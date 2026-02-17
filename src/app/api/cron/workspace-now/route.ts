import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { runWorkspaceDaily } from "@/lib/server/dailyRunner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false }
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const server = getSupabaseServer();
  if (!server) {
    return NextResponse.json({ error: "Missing server config" }, { status: 500 });
  }

  const db = server as any;
  const { data: workspace, error: workspaceError } = await db
    .from("workspaces")
    .select("id,name,owner_email,owner_user_id")
    .eq("owner_user_id", userData.user.id)
    .maybeSingle();

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: workspaceError?.message ?? "Workspace not found" }, { status: 404 });
  }

  const startedAt = new Date().toISOString();

  try {
    const result = await runWorkspaceDaily(db, workspace);

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

    return NextResponse.json(result);
  } catch (runError) {
    const message = runError instanceof Error ? runError.message : "Unknown daily-run error";

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

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
