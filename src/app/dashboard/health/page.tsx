"use client";

import { useEffect, useMemo, useState } from "react";
import { DailyRunHistoryItem, fetchDailyRunHistory } from "@/lib/data";

export default function HealthPage() {
  const [rows, setRows] = useState<DailyRunHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchDailyRunHistory(30);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const successCount = useMemo(
    () => rows.filter((row) => row.status === "success").length,
    [rows]
  );
  const failureCount = rows.length - successCount;
  const successRate = rows.length > 0 ? Math.round((successCount / rows.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Runs tracked</p>
          <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Success rate</p>
          <p className="mt-2 text-2xl font-semibold">{successRate}%</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Failures</p>
          <p className="mt-2 text-2xl font-semibold">{failureCount}</p>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Reliability</p>
            <h2 className="text-xl font-semibold">Daily run history</h2>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading run history...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No run history yet. Trigger a run from Dashboard first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                  <th className="pb-2 pr-4">Started</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Posts</th>
                  <th className="pb-2 pr-4">Briefs</th>
                  <th className="pb-2 pr-4">Emails</th>
                  <th className="pb-2 pr-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.started_at} className="border-t border-slate-100 align-top">
                    <td className="py-3 pr-4">{new Date(row.started_at).toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          row.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{row.posts_inserted}</td>
                    <td className="py-3 pr-4">{row.briefs_created}</td>
                    <td className="py-3 pr-4">{row.emails_sent}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600">{row.error_message || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
