import { getSupabase } from "@/lib/supabaseClient";

type ResolveWorkspaceResult = {
  workspaceId: string | null;
  userId: string | null;
  error: string | null;
};
const VOICE_LIMIT = 10;
const ATTACHMENT_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;

type BriefHighlight = {
  authorName: string;
  source: string;
  content: string;
  postedAt: string | null;
  authorUrl: string | null;
  postUrl: string | null;
  score: number;
};

type ClientBrief = {
  clientId: string;
  clientName: string;
  summary: string;
  highlights: BriefHighlight[];
};

export type DailyRunStatus = {
  started_at: string;
  completed_at: string | null;
  status: "success" | "failed";
  posts_inserted: number;
  briefs_created: number;
  emails_sent: number;
  error_message: string | null;
};

export type DailyRunHistoryItem = {
  started_at: string;
  completed_at: string | null;
  status: "success" | "failed";
  posts_inserted: number;
  briefs_created: number;
  emails_sent: number;
  error_message: string | null;
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

let cachedWorkspaceId: string | null = null;
let cachedUserId: string | null = null;

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

export const clearWorkspaceCache = () => {
  cachedWorkspaceId = null;
  cachedUserId = null;
};

export const fetchSessionUser = async () => {
  const supabase = getSupabase();
  if (!supabase) return { user: null, error: "Missing Supabase config." };

  const { data, error } = await supabase.auth.getUser();
  return { user: data.user ?? null, error: error?.message ?? null };
};

export const resolveWorkspace = async (): Promise<ResolveWorkspaceResult> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { workspaceId: null, userId: null, error: "Missing Supabase config." };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;

  if (authError || !user) {
    clearWorkspaceCache();
    return { workspaceId: null, userId: null, error: authError?.message ?? "Please sign in." };
  }

  if (cachedWorkspaceId && cachedUserId === user.id) {
    return { workspaceId: cachedWorkspaceId, userId: user.id, error: null };
  }

  const db = supabase as any;
  const { data: existing, error: existingError } = await db
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return { workspaceId: null, userId: user.id, error: existingError.message };
  }

  if (existing?.id) {
    cachedWorkspaceId = existing.id;
    cachedUserId = user.id;
    return { workspaceId: existing.id, userId: user.id, error: null };
  }

  const workspaceName =
    user.user_metadata?.full_name && String(user.user_metadata.full_name).trim().length > 0
      ? `${String(user.user_metadata.full_name).trim()}'s Workspace`
      : "My Workspace";

  const { data: created, error: createError } = await db
    .from("workspaces")
    .insert({
      owner_user_id: user.id,
      owner_email: user.email ?? "unknown@briefme.local",
      name: workspaceName
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    return {
      workspaceId: null,
      userId: user.id,
      error: createError?.message ?? "Could not create workspace."
    };
  }

  cachedWorkspaceId = created.id;
  cachedUserId = user.id;

  await db.from("beta_signups").upsert(
    {
      user_id: user.id,
      email: user.email ?? "unknown@briefme.local",
      workspace_id: created.id
    },
    { onConflict: "user_id" }
  );

  return { workspaceId: created.id, userId: user.id, error: null };
};

export const fetchWatchlist = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return [];

  const db = supabase as any;
  const { data } = await db
    .from("watchlist")
    .select(
      "id,name,role,avatar_url,cadence,tags,created_at,watchlist_sources(id,source,source_url,handle,created_at)"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return data ?? [];
};

export const insertWatchlistPerson = async (payload: {
  name: string;
  role?: string;
  avatar_url?: string;
  cadence?: string;
  tags?: string[];
  sources: Array<{ source: string; source_url: string; handle?: string | null }>;
}) => {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: "Missing Supabase config." };
  }

  const { workspaceId, error: workspaceError } = await resolveWorkspace();
  if (!workspaceId) {
    return { error: workspaceError ?? "Missing workspace." };
  }

  const db = supabase as any;
  const { count: existingCount } = await db
    .from("watchlist")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if ((existingCount ?? 0) >= VOICE_LIMIT) {
    return {
      error: `You are on the beta limit of ${VOICE_LIMIT} people. Remove one or request an upgrade.`
    };
  }

  const { data, error } = await db
    .from("watchlist")
    .insert({
      workspace_id: workspaceId,
      name: payload.name,
      role: payload.role,
      avatar_url: payload.avatar_url,
      cadence: payload.cadence ?? "daily",
      tags: payload.tags ?? []
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create person." };
  }

  if (payload.sources.length > 0) {
    const sourceRows = payload.sources.map((source) => ({
      watchlist_id: data.id,
      source: source.source,
      source_url: source.source_url,
      handle: source.handle ?? null
    }));

    const { error: sourceError } = await db.from("watchlist_sources").insert(sourceRows);

    if (sourceError) {
      await db.from("watchlist").delete().eq("id", data.id);
      return { error: sourceError.message };
    }
  }

  return { error: null };
};

export const fetchWorkspaceUsage = async () => {
  const supabase = getSupabase();
  if (!supabase) return { voices: 0, limit: VOICE_LIMIT };

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return { voices: 0, limit: VOICE_LIMIT };

  const db = supabase as any;
  const { count } = await db
    .from("watchlist")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  return { voices: count ?? 0, limit: VOICE_LIMIT };
};

export const insertWatchlistSource = async (payload: {
  watchlist_id: string;
  source: string;
  source_url: string;
  handle?: string | null;
}) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  const db = supabase as any;
  const { error } = await db.from("watchlist_sources").insert(payload);

  return { error: error?.message ?? null };
};

export const updateWatchlistSource = async (payload: {
  id: string;
  source: string;
  source_url: string;
  handle?: string | null;
}) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  const db = supabase as any;
  const { error } = await db
    .from("watchlist_sources")
    .update({
      source: payload.source,
      source_url: payload.source_url,
      handle: payload.handle ?? null
    })
    .eq("id", payload.id);

  return { error: error?.message ?? null };
};

export const deleteWatchlistSource = async (id: string) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  const db = supabase as any;
  const { error } = await db.from("watchlist_sources").delete().eq("id", id);

  return { error: error?.message ?? null };
};

export const deleteWatchlistPerson = async (id: string) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  const db = supabase as any;
  const { error } = await db.from("watchlist").delete().eq("id", id);

  return { error: error?.message ?? null };
};

export const updateWatchlistAvatar = async (payload: {
  watchlist_id: string;
  avatar_url: string | null;
}) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  const db = supabase as any;
  const { error } = await db
    .from("watchlist")
    .update({ avatar_url: payload.avatar_url })
    .eq("id", payload.watchlist_id);

  return { error: error?.message ?? null };
};

export const fetchClients = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return [];

  const db = supabase as any;
  const { data } = await db
    .from("clients")
    .select("id,name,positioning,narratives,risks,digest_enabled,digest_recipients,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return data ?? [];
};

export const fetchVoiceClientLinks = async () => {
  const supabase = getSupabase();
  if (!supabase) return {} as Record<string, string[]>;

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return {} as Record<string, string[]>;

  const db = supabase as any;
  const { data } = await db
    .from("client_watchlist_links")
    .select("watchlist_id,client_id,clients!inner(id,workspace_id)")
    .eq("clients.workspace_id", workspaceId);

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const voiceId = row.watchlist_id as string;
    const clientId = row.client_id as string;
    if (!map[voiceId]) map[voiceId] = [];
    map[voiceId].push(clientId);
  }

  return map;
};

export const saveVoiceClientLinks = async (watchlistId: string, clientIds: string[]) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  const db = supabase as any;
  const { error: deleteError } = await db
    .from("client_watchlist_links")
    .delete()
    .eq("watchlist_id", watchlistId);

  if (deleteError) return { error: deleteError.message };

  if (clientIds.length === 0) return { error: null };

  const rows = clientIds.map((clientId) => ({
    watchlist_id: watchlistId,
    client_id: clientId
  }));

  const { error: insertError } = await db.from("client_watchlist_links").insert(rows);
  return { error: insertError?.message ?? null };
};

export const insertClient = async (payload: {
  name: string;
  positioning?: string;
  narratives?: string;
  risks?: string;
  digest_enabled?: boolean;
  digest_recipients?: string[];
}) => {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: "Missing Supabase config." };
  }

  const { workspaceId, error: workspaceError } = await resolveWorkspace();
  if (!workspaceId) {
    return { error: workspaceError ?? "Missing workspace." };
  }

  const db = supabase as any;
  const { error } = await db.from("clients").insert({
    workspace_id: workspaceId,
    ...payload
  });

  return { error: error?.message ?? null };
};

export const updateClientDelivery = async (payload: {
  id: string;
  digest_enabled: boolean;
  digest_recipients: string[];
}) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  const db = supabase as any;
  const { error } = await db
    .from("clients")
    .update({
      digest_enabled: payload.digest_enabled,
      digest_recipients: payload.digest_recipients
    })
    .eq("id", payload.id);

  return { error: error?.message ?? null };
};

export const updateWatchlistPerson = async (payload: {
  id: string;
  name: string;
  cadence?: string;
  tags?: string[];
}) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  const db = supabase as any;
  const { error } = await db
    .from("watchlist")
    .update({
      name: payload.name,
      cadence: payload.cadence ?? "daily",
      tags: payload.tags ?? []
    })
    .eq("id", payload.id);

  return { error: error?.message ?? null };
};

export const fetchDashboardStats = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return { voices: 0, clients: 0, digests: 0, workspaceReady: false };
  }

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) {
    return { voices: 0, clients: 0, digests: 0, workspaceReady: false };
  }

  const db = supabase as any;
  const [voicesRes, clientsRes, digestsRes] = await Promise.all([
    db.from("watchlist").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    db.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    db.from("digests").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId)
  ]);

  return {
    voices: voicesRes.count ?? 0,
    clients: clientsRes.count ?? 0,
    digests: digestsRes.count ?? 0,
    workspaceReady: true
  };
};

export const fetchDailyRunStatus = async (): Promise<DailyRunStatus | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return null;

  const db = supabase as any;
  const { data } = await db
    .from("daily_run_logs")
    .select("started_at,completed_at,status,posts_inserted,briefs_created,emails_sent,error_message")
    .eq("workspace_id", workspaceId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return data as DailyRunStatus;
};

export const fetchDailyRunHistory = async (
  limit = 20
): Promise<DailyRunHistoryItem[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return [];

  const db = supabase as any;
  const { data } = await db
    .from("daily_run_logs")
    .select("started_at,completed_at,status,posts_inserted,briefs_created,emails_sent,error_message")
    .eq("workspace_id", workspaceId)
    .order("started_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as DailyRunHistoryItem[];
};

export const fetchRecentPosts = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return [];

  const db = supabase as any;
  const { data } = await db
    .from("posts")
    .select("id,source,author_name,author_url,post_url,content,posted_at,created_at")
    .eq("workspace_id", workspaceId)
    .order("posted_at", { ascending: false })
    .limit(20);

  return data ?? [];
};

export const fetchDigests = async () => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return [];

  const db = supabase as any;
  const { data } = await db
    .from("digests")
    .select("id,title,summary,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(12);

  return data ?? [];
};

export const addBriefingAttachment = async (payload: {
  digestId?: string | null;
  clientId?: string | null;
  fileName: string;
  mimeType?: string | null;
  fileSizeBytes: number;
  fileDataBase64: string;
}) => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config." };

  if (payload.fileSizeBytes > ATTACHMENT_SIZE_LIMIT_BYTES) {
    return { error: "Attachment is too large. Limit is 5 MB." };
  }

  const { workspaceId, error: workspaceError } = await resolveWorkspace();
  if (!workspaceId) return { error: workspaceError ?? "Missing workspace." };

  const db = supabase as any;
  const { error } = await db.from("briefing_attachments").insert({
    workspace_id: workspaceId,
    digest_id: payload.digestId ?? null,
    client_id: payload.clientId ?? null,
    file_name: payload.fileName,
    mime_type: payload.mimeType ?? null,
    file_size_bytes: payload.fileSizeBytes,
    file_data_base64: payload.fileDataBase64
  });

  return { error: error?.message ?? null };
};

export const fetchDigestAttachments = async (digestId: string) => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { workspaceId, error } = await resolveWorkspace();
  if (!workspaceId || error) return [];

  const db = supabase as any;
  const { data } = await db
    .from("briefing_attachments")
    .select("id,file_name,mime_type,file_size_bytes,file_data_base64,created_at")
    .eq("workspace_id", workspaceId)
    .eq("digest_id", digestId)
    .order("created_at", { ascending: false });

  return data ?? [];
};

export const runBlueskyIngestForWorkspace = async () => {
  const supabase = getSupabase();
  if (!supabase) return { inserted: 0, checked: 0, error: "Missing Supabase config." };

  const { workspaceId, error: workspaceError } = await resolveWorkspace();
  if (!workspaceId) return { inserted: 0, checked: 0, error: workspaceError ?? "Missing workspace." };

  try {
    const response = await fetch("/api/ingest/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId })
    });

    const payload = (await response.json()) as { inserted?: number; checked?: number; error?: string };

    if (!response.ok) {
      return {
        inserted: 0,
        checked: 0,
        error: payload.error ?? "Refresh failed."
      };
    }

    return {
      inserted: Number(payload.inserted ?? 0),
      checked: Number(payload.checked ?? 0),
      error: null
    };
  } catch {
    return { inserted: 0, checked: 0, error: "Refresh failed." };
  }
};

export const runDailyBriefNow = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      postsInserted: 0,
      briefsCreated: 0,
      emailsSent: 0,
      error: "Missing Supabase config."
    };
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    return {
      postsInserted: 0,
      briefsCreated: 0,
      emailsSent: 0,
      error: "Please log in again."
    };
  }

  try {
    const response = await fetch("/api/cron/workspace-now", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      }
    });

    const payload = (await response.json()) as {
      postsInserted?: number;
      briefsCreated?: number;
      emailsSent?: number;
      error?: string;
    };

    if (!response.ok) {
      return {
        postsInserted: 0,
        briefsCreated: 0,
        emailsSent: 0,
        error: payload.error ?? "Daily run failed."
      };
    }

    return {
      postsInserted: Number(payload.postsInserted ?? 0),
      briefsCreated: Number(payload.briefsCreated ?? 0),
      emailsSent: Number(payload.emailsSent ?? 0),
      error: null
    };
  } catch {
    return {
      postsInserted: 0,
      briefsCreated: 0,
      emailsSent: 0,
      error: "Daily run failed."
    };
  }
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

export const generateClientBriefs = async () => {
  const supabase = getSupabase();
  if (!supabase) return { error: "Missing Supabase config.", created: 0, briefs: [] as ClientBrief[] };

  const { workspaceId, error: workspaceError } = await resolveWorkspace();
  if (!workspaceId) {
    return {
      error: workspaceError ?? "Missing workspace.",
      created: 0,
      briefs: [] as ClientBrief[]
    };
  }

  const db = supabase as any;

  const [{ data: clients }, { data: posts }, { data: links }] = await Promise.all([
    db
      .from("clients")
      .select("id,name,positioning,narratives,risks")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    db
      .from("posts")
      .select("id,source,author_name,author_url,post_url,content,posted_at,watchlist_id")
      .eq("workspace_id", workspaceId)
      .order("posted_at", { ascending: false })
      .limit(120),
    db
      .from("client_watchlist_links")
      .select("client_id,watchlist_id")
  ]);

  const clientRows = clients ?? [];
  const postRows = posts ?? [];

  if (clientRows.length === 0) {
    return { error: "Add at least one client first.", created: 0, briefs: [] as ClientBrief[] };
  }

  const linksByClient = new Map<string, Set<string>>();
  for (const row of links ?? []) {
    const clientId = String((row as any).client_id ?? "");
    const watchlistId = String((row as any).watchlist_id ?? "");
    if (!clientId || !watchlistId) continue;
    if (!linksByClient.has(clientId)) linksByClient.set(clientId, new Set<string>());
    linksByClient.get(clientId)?.add(watchlistId);
  }

  const briefs: ClientBrief[] = clientRows.map((client: any) => {
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

    return {
      clientId: client.id,
      clientName: client.name,
      highlights,
      summary: composeBriefSummary(client, highlights)
    };
  });

  const nowLabel = new Date().toLocaleDateString();
  const inserts = briefs.map((brief) => ({
    workspace_id: workspaceId,
    title: `${brief.clientName} brief · ${nowLabel}`,
    summary: brief.summary
  }));

  const { error } = await db.from("digests").insert(inserts);
  if (error) {
    return { error: error.message, created: 0, briefs };
  }

  return { error: null, created: inserts.length, briefs };
};
