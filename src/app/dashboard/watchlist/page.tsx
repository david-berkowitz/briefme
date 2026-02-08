"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWatchlist, insertWatchlistPerson } from "@/lib/data";

type Voice = {
  id: string;
  name: string;
  role: string | null;
  cadence: string | null;
  tags: string[] | null;
  avatar_url: string | null;
  watchlist_sources: Array<{
    id: string;
    source: string;
    source_url: string;
    handle: string | null;
  }>;
};

type SourceInput = {
  id: string;
  source: string;
  source_url: string;
  handle?: string | null;
};

const newSource = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  source: "LinkedIn",
  source_url: ""
});

export default function WatchlistPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    cadence: "daily",
    tags: ""
  });
  const [sources, setSources] = useState<SourceInput[]>([newSource()]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [nameLocked, setNameLocked] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const canSave = useMemo(() => {
    const hasName = form.name.trim().length > 1;
    const hasSource = sources.some((source) => source.source_url.trim().length > 3);
    return hasName && hasSource;
  }, [form.name, sources]);

  const load = async () => {
    setLoading(true);
    const data = await fetchWatchlist();
    setVoices(data as Voice[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const detectSource = (value: string, fallback: string) => {
    const lower = value.toLowerCase();
    if (lower.includes("bsky.app") || lower.includes(".bsky.social")) {
      return "Bluesky";
    }
    if (lower.includes("linkedin.com")) {
      return "LinkedIn";
    }
    return fallback;
  };

  const normalizeBlueskyHandle = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http")) {
      const match = trimmed.match(/bsky\.app\/profile\/([^/]+)/i);
      return match ? match[1] : null;
    }
    return trimmed.replace(/^@/, "");
  };

  const hydrateBlueskyProfile = async (value: string) => {
    const handle = normalizeBlueskyHandle(value);
    if (!handle) return;

    try {
      const response = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`
      );
      if (!response.ok) return;

      const payload = (await response.json()) as { displayName?: string; avatar?: string };

      if (payload.displayName && !nameLocked) {
        setForm((prev) => ({ ...prev, name: payload.displayName ?? prev.name }));
      }
      if (payload.avatar) {
        setAvatarUrl(payload.avatar);
      }
    } catch {
      // Ignore profile lookup failures
    }
  };

  const updateSource = (id: string, updates: Partial<SourceInput>) => {
    setSources((prev) => prev.map((source) => (source.id === id ? { ...source, ...updates } : source)));
  };

  const addSourceRow = () => {
    setSources((prev) => [...prev, newSource()]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;

    setStatus("saving");

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const cleanedSources = sources
      .map((source) => ({
        source: source.source,
        source_url: source.source_url.trim(),
        handle: source.handle ?? null
      }))
      .filter((source) => source.source_url.length > 3);

    const { error } = await insertWatchlistPerson({
      name: form.name,
      avatar_url: avatarUrl ?? undefined,
      cadence: form.cadence,
      tags,
      sources: cleanedSources
    });

    setStatus(error ? "error" : "saved");

    if (!error) {
      setForm({ name: "", cadence: "daily", tags: "" });
      setSources([newSource()]);
      setNameLocked(false);
      setAvatarUrl(null);
      await load();
    }
  };

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Add a voice</p>
            <h2 className="text-xl font-semibold">Build your watchlist</h2>
          </div>
          <button
            type="submit"
            form="watchlist-form"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
            disabled={!canSave || status === "saving"}
          >
            {status === "saving" ? "Saving..." : "Save"}
          </button>
        </div>

        <form id="watchlist-form" onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Full name"
            value={form.name}
            onChange={(event) => {
              setForm({ ...form, name: event.target.value });
              setNameLocked(true);
            }}
            required
          />

          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(event) => setForm({ ...form, tags: event.target.value })}
          />

          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.cadence}
            onChange={(event) => setForm({ ...form, cadence: event.target.value })}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>

          <div className="rounded-2xl border border-slate-200 px-4 py-3 text-xs text-slate-500">
            Add as many sources as you want. We will merge them into one profile.
          </div>

          {sources.map((source) => (
            <div key={source.id} className="grid gap-3 md:col-span-2 md:grid-cols-[1.2fr_0.8fr]">
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Profile URL or handle"
                value={source.source_url}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const nextSource = detectSource(nextValue, source.source);
                  updateSource(source.id, { source_url: nextValue, source: nextSource });
                }}
                onBlur={(event) => {
                  if (detectSource(event.target.value, source.source) === "Bluesky") {
                    const handle = normalizeBlueskyHandle(event.target.value);
                    if (handle) {
                      updateSource(source.id, { handle });
                    }
                    void hydrateBlueskyProfile(event.target.value);
                  }
                }}
              />

              <select
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={source.source}
                onChange={(event) => updateSource(source.id, { source: event.target.value })}
              >
                <option>LinkedIn</option>
                <option>Bluesky</option>
                <option>Instagram</option>
                <option>Other</option>
              </select>
            </div>
          ))}

          <button
            type="button"
            onClick={addSourceRow}
            className="w-fit rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold"
          >
            + Add another source
          </button>
        </form>

        {status === "error" && (
          <p className="text-sm text-rose-600">Could not save yet. Check Supabase config.</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active voices</h3>
          <p className="text-sm text-slate-500">{voices.length} total</p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading watchlist...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {voices.map((voice) => (
              <div key={voice.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100">
                      {voice.avatar_url ? (
                        <img
                          src={voice.avatar_url}
                          alt={voice.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{voice.name}</p>
                      {voice.role && <p className="text-xs text-slate-500">{voice.role}</p>}
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {voice.watchlist_sources?.length ?? 0} sources
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(voice.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Cadence: {voice.cadence ?? "daily"}</span>
                  <span>Priority: High</span>
                </div>

                {voice.watchlist_sources?.length ? (
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {voice.watchlist_sources.map((source) => (
                      <span key={source.id} className="rounded-full border border-slate-200 px-3 py-1">
                        {source.source}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
