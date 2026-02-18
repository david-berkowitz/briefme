import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL;

  if (!supabaseUrl || !supabaseAnon || !apiKey || !fromEmail) {
    return NextResponse.json({ error: "Missing required config." }, { status: 500 });
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

  const body = (await request.json().catch(() => ({}))) as { clientId?: string };
  if (!body.clientId) {
    return NextResponse.json({ error: "Client id is required." }, { status: 400 });
  }

  const server = getSupabaseServer();
  if (!server) {
    return NextResponse.json({ error: "Missing server config" }, { status: 500 });
  }

  const db = server as any;
  const { data: workspace, error: workspaceError } = await db
    .from("workspaces")
    .select("id,name,owner_user_id")
    .eq("owner_user_id", userData.user.id)
    .maybeSingle();

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const { data: client, error: clientError } = await db
    .from("clients")
    .select("id,name,positioning,narratives,risks,digest_enabled,digest_recipients")
    .eq("id", body.clientId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const recipients = Array.isArray(client.digest_recipients)
    ? (client.digest_recipients as string[])
        .map((email) => email.trim().toLowerCase())
        .filter((email) => isValidEmail(email))
    : [];

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No valid recipient emails set for this client." }, { status: 400 });
  }

  const html = `
    <h2>${client.name} · Test Brief</h2>
    <p>This is a test delivery from BriefMe.</p>
    <p><strong>Workspace:</strong> ${workspace.name}</p>
    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Positioning:</strong> ${client.positioning ?? "Not set"}</p>
    <p><strong>Client needs:</strong> ${client.risks ?? "Not set"}</p>
    <p>If this looks good, daily client digest delivery is ready.</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject: `${client.name} · Test Brief Delivery`,
      html
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown email error");
    return NextResponse.json({ error: text }, { status: 500 });
  }

  return NextResponse.json({ sent: recipients.length });
}
