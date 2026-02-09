import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(7, Number(url.searchParams.get("days") ?? 1)));
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("beta_signups")
    .select("id,email,created_at,workspace_id")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    period_days: days,
    since: sinceIso,
    new_signups: (data ?? []).length,
    signups: data ?? []
  });
}
