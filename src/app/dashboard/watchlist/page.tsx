"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteWatchlistSource,
  fetchWatchlist,
  insertWatchlistPerson,
  insertWatchlistSource,
  updateWatchlistPerson,
  updateWatchlistSource
} from "@/lib/data";

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
  id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [nameLocked, setNameLocked] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null);
  const [sourceDrafts, setSourceDrafts] = useState<Record<string, SourceInput[]>>({});
  const [voiceDrafts, setVoiceDrafts] = useState<Record<string, { name: string; tagsText: string }>>({});
  const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});

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

  const updateVoiceSourceDraft = (voiceId: string, sourceId: string, updates: Partial<SourceInput>) => {
    setSourceDrafts((prev) => ({
      ...prev,
      [voiceId]: (prev[voiceId] ?? []).map((source) =>
        source.id === sourceId ? { ...source, ...updates } : source
      )
    }));
  };

  const addSourceRow = () => {
    setSources((prev) => [...prev, newSource()]);
  };

  const startSourceEdit = (voice: Voice) => {
    const draftRows =
      voice.watchlist_sources?.map((source) => ({
        id: source.id,
        source: source.source,
        source_url: source.source_url,
        handle: source.handle
      })) ?? [];
    setSourceDrafts((prev) => ({ ...prev, [voice.id]: draftRows.length ? draftRows : [newSource()] }));
    setVoiceDrafts((prev) => ({
      ...prev,
      [voice.id]: {
        name: voice.name,
        tagsText: (voice.tags ?? []).join(", ")
      }
    }));
    setEditingVoiceId(voice.id);
    setSourceStatus((prev) => ({ ...prev, [voice.id]: "" }));
  };

  const addVoiceSourceDraft = (voiceId: string) => {
    setSourceDrafts((prev) => ({ ...prev, [voiceId]: [...(prev[voiceId] ?? []), newSource()] }));
  };

  const removeVoiceSourceDraft = (voiceId: string, sourceId: string) => {
    setSourceDrafts((prev) => ({
      ...prev,
      [voiceId]: (prev[voiceId] ?? []).filter((source) => source.id !== sourceId)
    }));
  };

  const saveVoiceSources = async (voice: Voice) => {
    const drafts = sourceDrafts[voice.id] ?? [];
    const voiceDraft = voiceDrafts[voice.id] ?? { name: voice.name, tagsText: (voice.tags ?? []).join(", ") };
    setSourceStatus((prev) => ({ ...prev, [voice.id]: "Saving..." }));

    const parsedTags = voiceDraft.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const { error: personError } = await updateWatchlistPerson({
      id: voice.id,
      name: voiceDraft.name.trim() || voice.name,
      cadence: voice.cadence ?? "daily",
      tags: parsedTags
    });
    if (personError) {
      setSourceStatus((prev) => ({ ...prev, [voice.id]: `Could not update profile: ${personError}` }));
      return;
    }

    const normalizedDrafts = drafts
      .map((draft) => ({
        ...draft,
        source_url: draft.source_url.trim()
      }))
      .filter((draft) => draft.source_url.length > 3);

    const originalById = new Map(voice.watchlist_sources.map((source) => [source.id, source]));
    const keptOriginalIds = new Set(
      normalizedDrafts.filter((draft) => !draft.id.startsWith("temp-")).map((draft) => draft.id)
    );
    const idsToDelete = voice.watchlist_sources
      .filter((source) => !keptOriginalIds.has(source.id))
      .map((source) => source.id);

    for (const id of idsToDelete) {
      const { error } = await deleteWatchlistSource(id);
      if (error) {
        setSourceStatus((prev) => ({ ...prev, [voice.id]: `Could not remove source: ${error}` }));
        return;
      }
    }

    for (const draft of normalizedDrafts) {
      const detectedSource = detectSource(draft.source_url, draft.source);
      const handle =
        detectedSource === "Bluesky" ? normalizeBlueskyHandle(draft.source_url) ?? draft.handle ?? null : null;

      if (draft.id.startsWith("temp-")) {
        const { error } = await insertWatchlistSource({
          watchlist_id: voice.id,
          source: detectedSource,
          source_url: draft.source_url,
          handle
        });
        if (error) {
          setSourceStatus((prev) => ({ ...prev, [voice.id]: `Could not add source: ${error}` }));
          return;
        }
      } else {
        const original = originalById.get(draft.id);
        const unchanged =
          original &&
          original.source === detectedSource &&
          original.source_url === draft.source_url &&
          (original.handle ?? null) === (handle ?? null);

        if (!unchanged) {
          const { error } = await updateWatchlistSource({
            id: draft.id,
            source: detectedSource,
            source_url: draft.source_url,
            handle
          });
          if (error) {
            setSourceStatus((prev) => ({ ...prev, [voice.id]: `Could not update source: ${error}` }));
            return;
          }
        }
      }
    }

    setSourceStatus((prev) => ({ ...prev, [voice.id]: "Saved." }));
    setEditingVoiceId(null);
    await load();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;

    setStatus("saving");
    setErrorMessage("");

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
    if (error) {
      setErrorMessage(error);
    }

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
          <p className="text-sm text-rose-600">
            Could not save yet: {errorMessage || "Check Supabase config."}
          </p>
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
            {voices.map((voice) => {
              const isEditing = editingVoiceId === voice.id;
              const draftRows = sourceDrafts[voice.id] ?? [];
              const voiceDraft = voiceDrafts[voice.id] ?? {
                name: voice.name,
                tagsText: (voice.tags ?? []).join(", ")
              };

              return (
                <div key={voice.id} className="card space-y-3">
                  <div className="flex items-start justify-between gap-3">
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

                  {isEditing ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={voiceDraft.name}
                          placeholder="Full name"
                          onChange={(event) =>
                            setVoiceDrafts((prev) => ({
                              ...prev,
                              [voice.id]: { ...voiceDraft, name: event.target.value }
                            }))
                          }
                        />
                        <input
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={voiceDraft.tagsText}
                          placeholder="Tags (comma separated)"
                          onChange={(event) =>
                            setVoiceDrafts((prev) => ({
                              ...prev,
                              [voice.id]: { ...voiceDraft, tagsText: event.target.value }
                            }))
                          }
                        />
                      </div>

                      {draftRows.map((source) => (
                        <div key={source.id} className="grid gap-2 md:grid-cols-[1fr_130px_92px]">
                          <input
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            value={source.source_url}
                            placeholder="Profile URL or handle"
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              const nextSource = detectSource(nextValue, source.source);
                              updateVoiceSourceDraft(voice.id, source.id, {
                                source_url: nextValue,
                                source: nextSource
                              });
                            }}
                            onBlur={(event) => {
                              const nextSource = detectSource(event.target.value, source.source);
                              if (nextSource === "Bluesky") {
                                const handle = normalizeBlueskyHandle(event.target.value);
                                if (handle) {
                                  updateVoiceSourceDraft(voice.id, source.id, { handle });
                                }
                              }
                            }}
                          />
                          <select
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            value={source.source}
                            onChange={(event) =>
                              updateVoiceSourceDraft(voice.id, source.id, { source: event.target.value })
                            }
                          >
                            <option>LinkedIn</option>
                            <option>Bluesky</option>
                            <option>Instagram</option>
                            <option>Other</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeVoiceSourceDraft(voice.id, source.id)}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addVoiceSourceDraft(voice.id)}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        >
                          + Add source
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveVoiceSources(voice)}
                          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Save sources
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVoiceId(null);
                            setVoiceDrafts((prev) => ({ ...prev, [voice.id]: { name: voice.name, tagsText: (voice.tags ?? []).join(", ") } }));
                            setSourceStatus((prev) => ({ ...prev, [voice.id]: "" }));
                          }}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>

                      {sourceStatus[voice.id] ? (
                        <p
                          className={`text-xs ${
                            sourceStatus[voice.id] === "Saved." ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {sourceStatus[voice.id]}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {voice.watchlist_sources?.length ? (
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          {voice.watchlist_sources.map((source) => (
                            <span key={source.id} className="rounded-full border border-slate-200 px-3 py-1">
                              {source.source}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No sources yet.</p>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => startSourceEdit(voice)}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        >
                          Edit sources
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
