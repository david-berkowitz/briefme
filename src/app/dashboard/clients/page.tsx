"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchClients, insertClient } from "@/lib/data";

type Client = {
  id: string;
  name: string;
  positioning: string | null;
  narratives: string | null;
  risks: string | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    positioning: "",
    narratives: "",
    risks: ""
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    setStatus("saving");

    const { error } = await insertClient({
      name: form.name,
      positioning: form.positioning || undefined,
      narratives: form.narratives || undefined,
      risks: form.risks || undefined
    });

    setStatus(error ? "error" : "saved");
    if (!error) {
      setForm({ name: "", positioning: "", narratives: "", risks: "" });
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
            placeholder="Key narratives, proof points, differentiation"
            value={form.narratives}
            onChange={(event) => setForm({ ...form, narratives: event.target.value })}
          />
          <textarea
            className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Risks, sensitivities, red flags"
            value={form.risks}
            onChange={(event) => setForm({ ...form, risks: event.target.value })}
          />
        </form>
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
                  <p>Risks: {client.risks ?? "None noted"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
