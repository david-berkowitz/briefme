"use client";

import { useEffect, useState } from "react";
import { addBriefingAttachment, fetchDigestAttachments, fetchDigests, generateClientBriefs } from "@/lib/data";

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

type Attachment = {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number;
  file_data_base64: string;
  created_at: string;
};

const SIZE_LIMIT_BYTES = 5 * 1024 * 1024;

export default function DigestPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previews, setPreviews] = useState<BriefPreview[]>([]);
  const [attachmentStatus, setAttachmentStatus] = useState<Record<string, string>>({});
  const [attachmentsByDigest, setAttachmentsByDigest] = useState<Record<string, Attachment[]>>({});

  const load = async () => {
    setLoading(true);
    const data = await fetchDigests();
    setDigests(data as Digest[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const loadAttachmentsForDigest = async (digestId: string) => {
    const data = await fetchDigestAttachments(digestId);
    setAttachmentsByDigest((prev) => ({ ...prev, [digestId]: data as Attachment[] }));
  };

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

  const handleAttachFile = async (digestId: string, file: File) => {
    if (file.size > SIZE_LIMIT_BYTES) {
      setAttachmentStatus((prev) => ({
        ...prev,
        [digestId]: "Attachment too large. Limit is 5 MB."
      }));
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        const part = result.split(",")[1] ?? "";
        resolve(part);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const { error } = await addBriefingAttachment({
      digestId,
      fileName: file.name,
      mimeType: file.type || null,
      fileSizeBytes: file.size,
      fileDataBase64: base64
    });

    if (error) {
      setAttachmentStatus((prev) => ({ ...prev, [digestId]: error }));
      return;
    }

    setAttachmentStatus((prev) => ({ ...prev, [digestId]: "Attachment saved." }));
    await loadAttachmentsForDigest(digestId);
  };

  return (
    <div className="space-y-8">
      <section className="card space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Briefing workflow</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Generate today’s briefs.</li>
          <li>Review each client summary and adjust copy as needed.</li>
          <li>Attach supporting files (up to 5MB each) before sharing.</li>
        </ol>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Client briefing</p>
            <h2 className="text-xl font-semibold">Generate customized briefs</h2>
            <p className="mt-1 text-sm text-slate-600">
              Uses each client&apos;s positioning, narratives, and needs to rank recent posts and suggest takeaways.
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
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Attachments</p>
                  <label className="mt-2 inline-block cursor-pointer rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold">
                    Add file
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleAttachFile(digest.id, file);
                        }
                      }}
                    />
                  </label>
                  {attachmentStatus[digest.id] && (
                    <p className={`mt-2 text-xs ${attachmentStatus[digest.id] === "Attachment saved." ? "text-emerald-700" : "text-rose-600"}`}>
                      {attachmentStatus[digest.id]}
                    </p>
                  )}
                  <button
                    type="button"
                    className="ml-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                    onClick={() => void loadAttachmentsForDigest(digest.id)}
                  >
                    Refresh files
                  </button>
                  {(attachmentsByDigest[digest.id] ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      {(attachmentsByDigest[digest.id] ?? []).map((attachment) => (
                        <li key={attachment.id} className="flex items-center justify-between gap-2">
                          <span>{attachment.file_name} ({Math.ceil(attachment.file_size_bytes / 1024)} KB)</span>
                          <a
                            className="font-semibold underline"
                            href={`data:${attachment.mime_type || "application/octet-stream"};base64,${attachment.file_data_base64}`}
                            download={attachment.file_name}
                          >
                            Download
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
