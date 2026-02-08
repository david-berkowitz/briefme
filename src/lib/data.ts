import { getSupabase } from "@/lib/supabaseClient";

type WorkspaceId = string | null;

const getWorkspaceId = (): WorkspaceId => {
  return process.env.NEXT_PUBLIC_WORKSPACE_ID ?? null;
};

export const fetchWatchlist = async () => {
  const supabase = getSupabase();
  const workspaceId = getWorkspaceId();
  if (!supabase || !workspaceId) return [];

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
  const workspaceId = getWorkspaceId();
  if (!supabase || !workspaceId) {
    return { error: "Missing Supabase config." };
  }

  const db = supabase as any;

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
      return { error: sourceError.message };
    }
  }

  return { error: null };
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
  const workspaceId = getWorkspaceId();
  if (!supabase || !workspaceId) return [];

  const db = supabase as any;
  const { data } = await db
    .from("clients")
    .select("id,name,positioning,narratives,risks,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return data ?? [];
};

export const insertClient = async (payload: {
  name: string;
  positioning?: string;
  narratives?: string;
  risks?: string;
}) => {
  const supabase = getSupabase();
  const workspaceId = getWorkspaceId();
  if (!supabase || !workspaceId) {
    return { error: "Missing Supabase config." };
  }

  const db = supabase as any;
  const { error } = await db.from("clients").insert({
    workspace_id: workspaceId,
    ...payload
  });

  return { error: error?.message ?? null };
};

export const fetchDashboardStats = async () => {
  const supabase = getSupabase();
  const workspaceId = getWorkspaceId();
  if (!supabase || !workspaceId) {
    return { voices: 0, clients: 0, digests: 0 };
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
    digests: digestsRes.count ?? 0
  };
};

export const fetchRecentPosts = async () => {
  const supabase = getSupabase();
  const workspaceId = getWorkspaceId();
  if (!supabase || !workspaceId) return [];

  const db = supabase as any;
  const { data } = await db
    .from("posts")
    .select("id,source,author_name,author_url,post_url,content,posted_at,created_at")
    .eq("workspace_id", workspaceId)
    .order("posted_at", { ascending: false })
    .limit(10);

  return data ?? [];
};
