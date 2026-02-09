"use client";

import { useEffect, useState } from "react";
import { fetchDigests, generateClientBriefs } from "@/lib/data";

type Digest = {
  id: string;
  title: string;
  summary: string | null;
  created_at: string;
};

type BriefPreview = {
  clientId: string;
  clientName: string;
  summary: string;
};

export default function DigestPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previews, setPreviews] = useState<BriefPreview[]>([]);

  const load = async () => {
    setLoading(true);
    const data = await fetchDigests();
    setDigests(data as Digest[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMessage(null);

    const result = await generateClientBriefs();
    if (result.error) {
      setStatusMessage(result.error);
    } else {
      setStatusMessage(`Generated ${result.created} client brief${result.created === 1 ? "" : "s"}.`);
      setPreviews(
        result.briefs.map((brief) => ({
          clientId: brief.clientId,
          clientName: brief.clientName,
          summary: brief.summary
        }))
      );
      await load();
    }

    setGenerating(false);
  };

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Client briefing</p>
            <h2 className="text-xl font-semibold">Generate customized briefs</h2>
            <p className="mt-1 text-sm text-slate-600">
              Uses each client&apos;s positioning, narratives, and risks to rank recent posts and suggest takeaways.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary px-4 py-2 text-sm"
          >
            {generating ? "Generating..." : "Generate today’s briefs"}
          </button>
        </div>

        {statusMessage && (
          <p className={`text-sm ${statusMessage.startsWith("Generated") ? "text-emerald-700" : "text-rose-600"}`}>
            {statusMessage}
          </p>
        )}
      </section>

      {previews.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Freshly generated previews</h3>
          <div className="space-y-3">
            {previews.map((preview) => (
              <article key={preview.clientId} className="card space-y-2">
                <p className="text-sm font-semibold">{preview.clientName}</p>
                <p className="whitespace-pre-line text-sm text-slate-600">{preview.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Saved digest history</h3>
          <p className="text-sm text-slate-500">{digests.length} recent</p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading digests...</p>
        ) : digests.length === 0 ? (
          <p className="text-sm text-slate-500">
            No digests saved yet. Click “Generate today’s briefs” to create your first customized client summaries.
          </p>
        ) : (
          <div className="space-y-3">
            {digests.map((digest) => (
              <article key={digest.id} className="card space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{digest.title}</p>
                  <p className="text-xs text-slate-500">{new Date(digest.created_at).toLocaleString()}</p>
                </div>
                <p className="whitespace-pre-line text-sm text-slate-600">{digest.summary ?? "No summary stored."}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
