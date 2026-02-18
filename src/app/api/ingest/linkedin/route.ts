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
  email_subject?: string;
  email_text?: string;
};

const cleanUrl = (value: string) => value.replace(/[),.;]+$/, "").trim();

const parseLinkedInEmail = (subject?: string, text?: string) => {
  const full = `${subject ?? ""}\n${text ?? ""}`.trim();
  if (!full) {
    return {
      author_name: "",
      author_url: "",
      post_url: "",
      content: ""
    };
  }

  const profileMatch = full.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s>"')]+/i);
  const postMatch =
    full.match(/https?:\/\/(?:www\.)?linkedin\.com\/posts\/[^\s>"')]+/i) ??
    full.match(/https?:\/\/(?:www\.)?linkedin\.com\/feed\/update\/[^\s>"')]+/i);

  const subjectNameMatch = (subject ?? "").match(/^(.+?)\s+(posted|shared|commented|published)\b/i);
  const fallbackNameMatch = full.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(posted|shared|commented)\b/);
  const author_name =
    subjectNameMatch?.[1]?.trim() ??
    fallbackNameMatch?.[1]?.trim() ??
    "";

  const contentLines = (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^view post$/i.test(line))
    .filter((line) => !/^linkedin$/i.test(line))
    .filter((line) => !/^you (might|may) know/i.test(line))
    .filter((line) => !/^manage your/i.test(line))
    .filter((line) => !line.includes("linkedin.com"));

  const content = contentLines.slice(0, 4).join(" ");

  return {
    author_name,
    author_url: profileMatch ? cleanUrl(profileMatch[0]) : "",
    post_url: postMatch ? cleanUrl(postMatch[0]) : "",
    content
  };
};

export async function POST(request: Request) {
  const secret = process.env.INGEST_SECRET;
  const incoming = request.headers.get("x-ingest-secret");

  if (!secret || incoming !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const body = (await request.json()) as LinkedInBody;
  const workspaceId =
    body.workspace_id ??
    process.env.LINKEDIN_DEFAULT_WORKSPACE_ID ??
    null;

  const parsed = body.email_text || body.email_subject
    ? parseLinkedInEmail(body.email_subject, body.email_text)
    : null;

  if (!supabase || !workspaceId) {
    return NextResponse.json({ error: "Missing workspace id or server config" }, { status: 400 });
  }

  const db = supabase as any;

  let watchlistId = body.watchlist_id ?? null;
  const resolvedAuthorUrl = body.author_url ?? parsed?.author_url ?? "";
  if (!watchlistId && resolvedAuthorUrl) {
    const { data: sourceMatch } = await db
      .from("watchlist_sources")
      .select("watchlist_id")
      .eq("source", "LinkedIn")
      .eq("source_url", resolvedAuthorUrl)
      .limit(1)
      .single();

    watchlistId = (sourceMatch as { watchlist_id?: string } | null)?.watchlist_id ?? null;
  }

  const row = {
    workspace_id: workspaceId,
    watchlist_id: watchlistId,
    source: "LinkedIn",
    author_name: body.author_name ?? parsed?.author_name ?? "LinkedIn update",
    author_url: resolvedAuthorUrl || null,
    post_url: body.post_url ?? parsed?.post_url ?? null,
    content: body.content ?? parsed?.content ?? "",
    posted_at: body.posted_at ?? null
  };

  let error: { message: string } | null = null;
  if (row.post_url) {
    const { data: existing } = await db
      .from("posts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("post_url", row.post_url)
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

  return NextResponse.json({
    inserted: 1,
    parsed: !!parsed,
    author_name: row.author_name,
    author_url: row.author_url,
    post_url: row.post_url
  });
}
