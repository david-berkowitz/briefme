import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { fetchBlueskyPosts, fetchBlueskyProfile } from "@/lib/ingest/bluesky";

export const runtime = "nodejs";

type SourceRow = {
  source_url: string | null;
  watchlist_id: string;
  watchlist: { name: string | null; avatar_url: string | null } | null;
};

export async function POST(request: Request) {
  const supabase = getSupabaseServer();
  const body = (await request.json().catch(() => ({}))) as { workspaceId?: string };
  const workspaceId = body.workspaceId ?? null;

  if (!supabase || !workspaceId) {
    return NextResponse.json({ error: "Missing workspace id or server config" }, { status: 400 });
  }

  const db = supabase as any;

  const { data } = await db
    .from("watchlist_sources")
    .select("id,source_url,watchlist_id,watchlist!inner(id,workspace_id,name,avatar_url)")
    .eq("source", "Bluesky")
    .eq("watchlist.workspace_id", workspaceId);

  const sources = (data ?? []) as SourceRow[];

  if (sources.length === 0) {
    return NextResponse.json({ inserted: 0, checked: 0 });
  }

  let inserted = 0;

  for (const source of sources) {
    if (!source.source_url) continue;

    if (!source.watchlist?.avatar_url) {
      const profile = await fetchBlueskyProfile(source.source_url);
      if (profile?.avatar) {
        await db.from("watchlist").update({ avatar_url: profile.avatar }).eq("id", source.watchlist_id);
      }
      if (profile?.displayName && source.watchlist?.name === "Unknown") {
        await db.from("watchlist").update({ name: profile.displayName }).eq("id", source.watchlist_id);
      }
    }

    const posts = await fetchBlueskyPosts(source.source_url);
    if (!posts.length) continue;

    const payload = posts.map((post) => ({
      workspace_id: workspaceId,
      watchlist_id: source.watchlist_id,
      source: "Bluesky",
      author_name: post.authorName,
      author_url: post.authorUrl,
      post_url: post.postUrl,
      content: post.content,
      posted_at: post.postedAt
    }));

    const { error } = await db.from("posts").upsert(payload, {
      onConflict: "post_url"
    });

    if (!error) inserted += payload.length;
  }

  return NextResponse.json({ inserted, checked: sources.length });
}
