import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type LinkedInBody = {
  workspace_id?: string;
  watchlist_id?: string;
  author_name?: string;
  author_url?: string;
  post_url?: string;
  content?: string;
  posted_at?: string | null;
};

export async function POST(request: Request) {
  const secret = process.env.INGEST_SECRET;
  const incoming = request.headers.get("x-ingest-secret");

  if (!secret || incoming !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const body = (await request.json()) as LinkedInBody;
  const workspaceId = body.workspace_id ?? null;

  if (!supabase || !workspaceId) {
    return NextResponse.json({ error: "Missing workspace id or server config" }, { status: 400 });
  }

  const db = supabase as any;

  let watchlistId = body.watchlist_id ?? null;
  if (!watchlistId && body.author_url) {
    const { data: sourceMatch } = await db
      .from("watchlist_sources")
      .select("watchlist_id")
      .eq("source", "LinkedIn")
      .eq("source_url", body.author_url)
      .limit(1)
      .single();

    watchlistId = (sourceMatch as { watchlist_id?: string } | null)?.watchlist_id ?? null;
  }

  const row = {
    workspace_id: workspaceId,
    watchlist_id: watchlistId,
    source: "LinkedIn",
    author_name: body.author_name,
    author_url: body.author_url,
    post_url: body.post_url,
    content: body.content,
    posted_at: body.posted_at ?? null
  };

  let error: { message: string } | null = null;
  if (body.post_url) {
    const { data: existing } = await db
      .from("posts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("post_url", body.post_url)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const insertRes = await db.from("posts").insert(row);
      error = insertRes.error;
    }
  } else {
    const insertRes = await db.from("posts").insert(row);
    error = insertRes.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: 1 });
}
