"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchClients, insertClient, updateClientDelivery } from "@/lib/data";

type Client = {
  id: string;
  name: string;
  positioning: string | null;
  narratives: string | null;
  risks: string | null;
  digest_enabled: boolean;
  digest_recipients: string[] | null;
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    positioning: "",
    goals: "",
    narratives: "",
    doLanguage: "",
    dontLanguage: "",
    risks: "",
    digestRecipients: "",
    digestEnabled: false
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, { enabled: boolean; recipientsText: string }>>({});
  const [deliveryStatus, setDeliveryStatus] = useState<Record<string, string>>({});

  const canSave = useMemo(() => form.name.trim().length > 1, [form.name]);

  const load = async () => {
    setLoading(true);
    const data = await fetchClients();
    setClients(data as Client[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setDeliveryDrafts((prev) => {
      const next = { ...prev };
      for (const client of clients) {
        if (!next[client.id]) {
          next[client.id] = {
            enabled: !!client.digest_enabled,
            recipientsText: (client.digest_recipients ?? []).join(", ")
          };
        }
      }
      return next;
    });
  }, [clients]);

  const parseRecipients = (value: string) =>
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
      .filter((email, index, array) => array.indexOf(email) === index);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    setStatus("saving");

    const narrativeParts = [
      form.narratives.trim(),
      form.goals.trim() ? `[GOALS]\n${form.goals.trim()}\n[/GOALS]` : "",
      form.doLanguage.trim() ? `[DO]\n${form.doLanguage.trim()}\n[/DO]` : "",
      form.dontLanguage.trim() ? `[DONT]\n${form.dontLanguage.trim()}\n[/DONT]` : ""
    ].filter(Boolean);

    const { error } = await insertClient({
      name: form.name,
      positioning: form.positioning || undefined,
      narratives: narrativeParts.join("\n\n") || undefined,
      risks: form.risks || undefined,
      digest_enabled: form.digestEnabled,
      digest_recipients: parseRecipients(form.digestRecipients)
    });

    setStatus(error ? "error" : "saved");
    if (!error) {
      setForm({
        name: "",
        positioning: "",
        goals: "",
        narratives: "",
        doLanguage: "",
        dontLanguage: "",
        risks: "",
        digestRecipients: "",
        digestEnabled: false
      });
      await load();
    }
  };

  const saveDelivery = async (client: Client) => {
    const draft = deliveryDrafts[client.id];
    if (!draft) return;

    const recipients = parseRecipients(draft.recipientsText);
    const { error } = await updateClientDelivery({
      id: client.id,
      digest_enabled: draft.enabled,
      digest_recipients: recipients
    });
    setDeliveryStatus((prev) => ({
      ...prev,
      [client.id]: error ? `Could not save: ${error}` : "Saved."
    }));
    if (!error) {
      await load();
    }
  };

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">New client</p>
            <h2 className="text-xl font-semibold">Client context profile</h2>
          </div>
          <button
            onClick={handleSubmit}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
            disabled={!canSave || status === "saving"}
          >
            {status === "saving" ? "Saving..." : "Save client"}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Client name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Primary positioning"
            value={form.positioning}
            onChange={(event) => setForm({ ...form, positioning: event.target.value })}
          />
          <textarea
            className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Client goals this quarter"
            value={form.goals}
            onChange={(event) => setForm({ ...form, goals: event.target.value })}
          />
          <textarea
            className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Key narratives, proof points, differentiation"
            value={form.narratives}
            onChange={(event) => setForm({ ...form, narratives: event.target.value })}
          />
          <textarea
            className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Do: preferred language and angles"
            value={form.doLanguage}
            onChange={(event) => setForm({ ...form, doLanguage: event.target.value })}
          />
          <textarea
            className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Don’t: language to avoid"
            value={form.dontLanguage}
            onChange={(event) => setForm({ ...form, dontLanguage: event.target.value })}
          />
          <textarea
            className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Client needs, priorities, sensitivities (optional)"
            value={form.risks}
            onChange={(event) => setForm({ ...form, risks: event.target.value })}
          />
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Digest recipients (comma separated emails)"
            value={form.digestRecipients}
            onChange={(event) => setForm({ ...form, digestRecipients: event.target.value })}
          />
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.digestEnabled}
              onChange={(event) => setForm({ ...form, digestEnabled: event.target.checked })}
            />
            Send this client a daily digest email
          </label>
        </form>
        <p className="text-xs text-slate-500">
          We use this profile to translate tracked updates into client-specific takeaways and actions.
        </p>
        {status === "error" && (
          <p className="text-sm text-rose-600">Could not save yet. Check Supabase config.</p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Client roster</h3>
          <p className="text-sm text-slate-500">{clients.length} active</p>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading clients...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {clients.map((client) => (
              <div key={client.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{client.name}</p>
                    <p className="text-xs text-slate-500">{client.positioning ?? "Positioning TBD"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Active
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  <p>Goals: {extractTaggedSection(client.narratives, "GOALS") || "Not set yet"}</p>
                  <p>Do: {extractTaggedSection(client.narratives, "DO") || "Not set yet"}</p>
                  <p>Don’t: {extractTaggedSection(client.narratives, "DONT") || "Not set yet"}</p>
                  <p>Needs: {client.risks ?? "None noted yet"}</p>
                  <p>Digest delivery: {client.digest_enabled ? "Enabled" : "Off"}</p>
                  <p>
                    Recipients: {(client.digest_recipients ?? []).length > 0 ? (client.digest_recipients ?? []).join(", ") : "None"}
                  </p>
                  {stripTaggedSections(client.narratives) && (
                    <p>Notes: {stripTaggedSections(client.narratives)}</p>
                  )}
                </div>
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Email delivery</p>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder="comma separated emails"
                    value={deliveryDrafts[client.id]?.recipientsText ?? ""}
                    onChange={(event) =>
                      setDeliveryDrafts((prev) => ({
                        ...prev,
                        [client.id]: {
                          enabled: prev[client.id]?.enabled ?? client.digest_enabled,
                          recipientsText: event.target.value
                        }
                      }))
                    }
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={deliveryDrafts[client.id]?.enabled ?? client.digest_enabled}
                      onChange={(event) =>
                        setDeliveryDrafts((prev) => ({
                          ...prev,
                          [client.id]: {
                            enabled: event.target.checked,
                            recipientsText:
                              prev[client.id]?.recipientsText ?? (client.digest_recipients ?? []).join(", ")
                          }
                        }))
                      }
                    />
                    Send daily digest for this client
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveDelivery(client)}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                  >
                    Save email settings
                  </button>
                  {deliveryStatus[client.id] && (
                    <p className={`text-xs ${deliveryStatus[client.id] === "Saved." ? "text-emerald-700" : "text-rose-600"}`}>
                      {deliveryStatus[client.id]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
