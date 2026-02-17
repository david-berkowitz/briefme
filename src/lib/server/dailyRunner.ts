import { fetchBlueskyPosts, fetchBlueskyProfile } from "@/lib/ingest/bluesky";

type BriefHighlight = {
  authorName: string;
  source: string;
  content: string;
  postedAt: string | null;
  authorUrl: string | null;
  postUrl: string | null;
  score: number;
};

type PreparedClientBrief = {
  clientId: string;
  clientName: string;
  digestEnabled: boolean;
  digestRecipients: string[];
  workspace_id: string;
  title: string;
  summary: string;
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

const extractTaggedSection = (text: string | null | undefined, tag: "GOALS" | "DO" | "DONT") => {
  if (!text) return "";
  const match = text.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, "i"));
  return match?.[1]?.trim() ?? "";
};

const stripTaggedSections = (text: string | null | undefined) => {
  if (!text) return "";
  return text.replace(/\[(GOALS|DO|DONT)\][\s\S]*?\[\/\1\]/gi, "").trim();
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
    return [
      "What changed:",
      "- No new tracked updates matched this client today.",
      "",
      "Why it matters for this client:",
      "- Your monitoring is active, but there are no high-signal items to brief right now.",
      "",
      "Recommended action:",
      "- Keep monitoring.",
      "- Refresh sources and expand watchlist coverage if this repeats for 2+ days."
    ].join("\n");
  }

  const lines = top.map((item) => {
    const cleaned = (item.content ?? "").replace(/\s+/g, " ").trim();
    const short = cleaned.length > 180 ? `${cleaned.slice(0, 180)}...` : cleaned;
    const link = item.postUrl ?? item.authorUrl ?? "";
    return link
      ? `- ${item.authorName} (${item.source}): ${short} [Source: ${link}]`
      : `- ${item.authorName} (${item.source}): ${short}`;
  });

  const goals = extractTaggedSection(client.narratives, "GOALS");
  const doGuidance = extractTaggedSection(client.narratives, "DO");
  const dontGuidance = extractTaggedSection(client.narratives, "DONT");
  const baseNarratives = stripTaggedSections(client.narratives);
  const strategyFocus = [client.positioning, goals || client.risks, baseNarratives].filter(Boolean).join(" | ");
  const firstSignal = top[0];
  const actionHook = firstSignal
    ? `${firstSignal.source} conversation from ${firstSignal.authorName}`
    : "today's top signal";

  return [
    "What changed:",
    ...lines,
    "",
    "Why it matters for this client:",
    strategyFocus
      ? `- Priority context (positioning + client needs): ${strategyFocus}`
      : "- Add client priorities in Clients to improve matching and recommendations.",
    "- This signal can shape messaging, positioning, or response timing today.",
    "",
    "Recommended action:",
    `- Draft a short POV tied to ${actionHook}.`,
    doGuidance ? `- Use this guidance: ${doGuidance}` : "- Anchor the response in one clear proof point for this client.",
    dontGuidance ? `- Avoid: ${dontGuidance}` : ""
  ].join("\n");
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const summaryPreview = (summary: string) => {
  const cleaned = summary.replace(/\s+/g, " ").trim();
  if (!cleaned) return "No summary text yet. Open dashboard digest for full details.";
  return cleaned.length > 420 ? `${cleaned.slice(0, 420)}...` : cleaned;
};

const sendDigestEmail = async (
  to: string,
  workspaceName: string,
  briefItems: Array<{ title: string; summary: string }>
) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return { sent: false, reason: "Email provider not configured." };
  }

  const summaryHtml = briefItems
    .map((item) => {
      const cleaned = escapeHtml(summaryPreview(item.summary)).replace(/\n/g, "<br />");
      return `
        <li style="margin-bottom:18px;">
          <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(item.title)}</div>
          <div style="line-height:1.45;">${cleaned}</div>
        </li>
      `;
    })
    .join("");

  const html = `
    <h2>${workspaceName}: Daily Brief</h2>
    <p>Here is your daily BriefMe update:</p>
    <ul style="padding-left:18px;">${summaryHtml}</ul>
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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const sendClientDigestEmail = async (
  recipients: string[],
  clientName: string,
  workspaceName: string,
  summary: string
) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return { sent: false, reason: "Email provider not configured." };
  }

  const to = recipients.filter((email) => isValidEmail(email.trim().toLowerCase()));
  if (to.length === 0) {
    return { sent: false, reason: "No valid recipient emails." };
  }

  const cleaned = escapeHtml(summaryPreview(summary)).replace(/\n/g, "<br />");
  const html = `
    <h2>${escapeHtml(clientName)} · Daily Brief</h2>
    <p>Workspace: ${escapeHtml(workspaceName)}</p>
    <div style="line-height:1.45;">${cleaned}</div>
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
      to,
      subject: `${clientName} · Daily Brief`,
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

    const withUrl = payload.filter((row) => row.post_url);
    const withoutUrl = payload.filter((row) => !row.post_url);

    let existingUrls = new Set<string>();
    if (withUrl.length > 0) {
      const { data: existing } = await db
        .from("posts")
        .select("post_url")
        .eq("workspace_id", workspace.id)
        .in(
          "post_url",
          withUrl.map((row) => row.post_url)
        );
      existingUrls = new Set((existing ?? []).map((row: any) => row.post_url));
    }

    const toInsert = [
      ...withUrl.filter((row) => !existingUrls.has(row.post_url)),
      ...withoutUrl
    ];

    if (toInsert.length === 0) {
      continue;
    }

    const { error } = await db.from("posts").insert(toInsert);
    if (!error) postsInserted += toInsert.length;
  }

  const [{ data: clients }, { data: posts }, { data: links }] = await Promise.all([
    db
      .from("clients")
      .select("id,name,positioning,narratives,risks,digest_enabled,digest_recipients")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false }),
    db
      .from("posts")
      .select("id,source,author_name,author_url,post_url,content,posted_at,watchlist_id")
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
    const preparedClientBriefs: PreparedClientBrief[] = clientRows.map((client: any) => {
      const contextText = [
        client.positioning,
        stripTaggedSections(client.narratives),
        extractTaggedSection(client.narratives, "GOALS"),
        extractTaggedSection(client.narratives, "DO"),
        client.risks
      ]
        .filter(Boolean)
        .join(" ");
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
            authorUrl: post.author_url ?? null,
            postUrl: post.post_url ?? null,
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
              authorUrl: post.author_url ?? null,
              postUrl: post.post_url ?? null,
              content: post.content ?? "",
              postedAt: post.posted_at,
              score: 0
            }))
          : [];

      const highlights = (scored.length ? scored : fallback).slice(0, 3);
      const summary = composeBriefSummary(client, highlights);
      return {
        clientId: client.id as string,
        clientName: client.name as string,
        digestEnabled: !!client.digest_enabled,
        digestRecipients: Array.isArray(client.digest_recipients)
          ? (client.digest_recipients as string[])
          : [],
        workspace_id: workspace.id,
        title: `${client.name} brief · ${new Date().toLocaleDateString()}`,
        summary
      };
    });

    const inserts = preparedClientBriefs.map((item) => ({
      workspace_id: item.workspace_id,
      title: item.title,
      summary: item.summary
    }));

    const { error } = await db.from("digests").insert(inserts);
    if (!error) briefsCreated += inserts.length;

    const emailItems = inserts.slice(0, 2).map((item: any) => ({
      title: item.title as string,
      summary: String(item.summary ?? "").slice(0, 800)
    }));

    if (emailItems.length > 0) {
      const mail = await sendDigestEmail(workspace.owner_email, workspace.name, emailItems);
      if (mail.sent) emailsSent += 1;
    }

    for (const brief of preparedClientBriefs) {
      if (!brief.digestEnabled || brief.digestRecipients.length === 0) continue;
      const sent = await sendClientDigestEmail(
        brief.digestRecipients,
        brief.clientName,
        workspace.name,
        brief.summary
      );
      if (sent.sent) emailsSent += 1;
    }
  }

  return { postsInserted, briefsCreated, emailsSent };
};
