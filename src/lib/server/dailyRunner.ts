import { fetchBlueskyPosts, fetchBlueskyProfile } from "@/lib/ingest/bluesky";

type BriefHighlight = {
  authorName: string;
  source: string;
  content: string;
  postedAt: string | null;
  score: number;
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "about",
  "into",
  "have",
  "will",
  "just",
  "when",
  "they",
  "them",
  "their",
  "what",
  "where",
  "were",
  "been",
  "also",
  "than",
  "then",
  "you",
  "our",
  "are",
  "not",
  "but",
  "can",
  "all",
  "one",
  "two",
  "new",
  "how"
]);

const tokenize = (value: string | null | undefined) => {
  if (!value) return [];
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOPWORDS.has(token));
};

const scorePost = (content: string | null, keywords: Set<string>, postedAt: string | null) => {
  if (!content) return 0;

  const tokens = tokenize(content);
  const overlap = tokens.reduce((count, token) => (keywords.has(token) ? count + 1 : count), 0);

  let recencyBoost = 0;
  if (postedAt) {
    const ageMs = Date.now() - new Date(postedAt).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    if (ageMs <= dayMs) recencyBoost = 2;
    else if (ageMs <= 3 * dayMs) recencyBoost = 1;
  }

  return overlap + recencyBoost;
};

const composeBriefSummary = (client: any, highlights: BriefHighlight[]) => {
  const top = highlights.slice(0, 3);

  if (top.length === 0) {
    return `No strong matches found for ${client.name} today. Recommended move: monitor and wait for stronger signal overlap with your narratives.`;
  }

  const lines = top.map((item, index) => {
    const cleaned = (item.content ?? "").replace(/\s+/g, " ").trim();
    const short = cleaned.length > 180 ? `${cleaned.slice(0, 180)}...` : cleaned;
    return `${index + 1}. ${item.authorName} (${item.source}): ${short}`;
  });

  const strategyFocus = [client.positioning, client.narratives, client.risks].filter(Boolean).join(" | ");

  return [
    `Client focus: ${client.name}`,
    strategyFocus ? `Context: ${strategyFocus}` : "Context: No custom context added yet.",
    "Top matched signals:",
    ...lines,
    "Recommended move: publish a short POV response tied to your strongest differentiator and one proof point."
  ].join("\n");
};

const sendDigestEmail = async (to: string, workspaceName: string, summaryLines: string[]) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return { sent: false, reason: "Email provider not configured." };
  }

  const html = `
    <h2>${workspaceName}: Daily Brief</h2>
    <p>Here is your daily BriefMe update:</p>
    <ul>${summaryLines.map((line) => `<li>${line}</li>`).join("")}</ul>
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://briefme.info"}/dashboard/digest">Open full dashboard digest</a></p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: `${workspaceName} · Daily Brief`,
      html
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown email error");
    return { sent: false, reason: text };
  }

  return { sent: true, reason: null };
};

export const runWorkspaceDaily = async (db: any, workspace: { id: string; name: string; owner_email: string }) => {
  let postsInserted = 0;
  let briefsCreated = 0;
  let emailsSent = 0;

  const { data: sources } = await db
    .from("watchlist_sources")
    .select("id,source,source_url,watchlist_id,watchlist!inner(id,workspace_id,name,avatar_url)")
    .eq("source", "Bluesky")
    .eq("watchlist.workspace_id", workspace.id);

  for (const source of sources ?? []) {
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
      workspace_id: workspace.id,
      watchlist_id: source.watchlist_id,
      source: "Bluesky",
      author_name: post.authorName,
      author_url: post.authorUrl,
      post_url: post.postUrl,
      content: post.content,
      posted_at: post.postedAt
    }));

    const { error } = await db.from("posts").upsert(payload, { onConflict: "post_url" });
    if (!error) postsInserted += payload.length;
  }

  const [{ data: clients }, { data: posts }, { data: links }] = await Promise.all([
    db
      .from("clients")
      .select("id,name,positioning,narratives,risks")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false }),
    db
      .from("posts")
      .select("id,source,author_name,content,posted_at,watchlist_id")
      .eq("workspace_id", workspace.id)
      .order("posted_at", { ascending: false })
      .limit(120),
    db.from("client_watchlist_links").select("client_id,watchlist_id")
  ]);

  const clientRows = clients ?? [];
  const postRows = posts ?? [];
  const linksByClient = new Map<string, Set<string>>();
  for (const row of links ?? []) {
    const clientId = String(row.client_id ?? "");
    const watchlistId = String(row.watchlist_id ?? "");
    if (!clientId || !watchlistId) continue;
    if (!linksByClient.has(clientId)) linksByClient.set(clientId, new Set<string>());
    linksByClient.get(clientId)?.add(watchlistId);
  }

  if (clientRows.length > 0) {
    const inserts = clientRows.map((client: any) => {
      const contextText = [client.positioning, client.narratives, client.risks].filter(Boolean).join(" ");
      const keywords = new Set(tokenize(contextText));
      const linkedWatchlistIds = linksByClient.get(client.id) ?? null;
      const scopedPosts =
        linkedWatchlistIds && linkedWatchlistIds.size > 0
          ? postRows.filter((post: any) => post.watchlist_id && linkedWatchlistIds.has(post.watchlist_id))
          : postRows;

      const scored = scopedPosts
        .map((post: any) => {
          const score = scorePost(post.content, keywords, post.posted_at);
          return {
            authorName: post.author_name,
            source: post.source,
            content: post.content ?? "",
            postedAt: post.posted_at,
            score
          } as BriefHighlight;
        })
        .filter((post: BriefHighlight) => post.score > 0)
        .sort((a: BriefHighlight, b: BriefHighlight) => b.score - a.score);

      const fallback =
        scored.length === 0
          ? scopedPosts.slice(0, 3).map((post: any) => ({
              authorName: post.author_name,
              source: post.source,
              content: post.content ?? "",
              postedAt: post.posted_at,
              score: 0
            }))
          : [];

      const highlights = (scored.length ? scored : fallback).slice(0, 3);
      const summary = composeBriefSummary(client, highlights);
      return {
        workspace_id: workspace.id,
        title: `${client.name} brief · ${new Date().toLocaleDateString()}`,
        summary
      };
    });

    const { error } = await db.from("digests").insert(inserts);
    if (!error) briefsCreated += inserts.length;

    const topEmailLines = inserts.slice(0, 3).map((item: any) => `${item.title}`);
    if (topEmailLines.length > 0) {
      const mail = await sendDigestEmail(workspace.owner_email, workspace.name, topEmailLines);
      if (mail.sent) emailsSent = 1;
    }
  }

  return { postsInserted, briefsCreated, emailsSent };
};
