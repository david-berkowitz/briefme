"use client";

import { useEffect, useState } from "react";
import {
  DailyRunStatus,
  fetchDashboardStats,
  fetchDailyRunStatus,
  fetchRecentPosts,
  runBlueskyIngestForWorkspace,
  runDailyBriefNow
} from "@/lib/data";

type Stats = {
  voices: number;
  clients: number;
  digests: number;
  workspaceReady: boolean;
};

type Post = {
  id: string;
  source: string;
  author_name: string;
  author_url: string | null;
  post_url: string | null;
  content: string | null;
  posted_at: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    voices: 0,
    clients: 0,
    digests: 0,
    workspaceReady: false
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [runningDaily, setRunningDaily] = useState(false);
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyRunStatus | null>(null);

  const loadStats = async () => {
    setLoading(true);
    const data = await fetchDashboardStats();
    setStats(data);
    setLoading(false);
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    const data = await fetchRecentPosts();
    setPosts(data as Post[]);
    setLoadingPosts(false);
  };

  const loadDailyStatus = async () => {
    const status = await fetchDailyRunStatus();
    setDailyStatus(status);
  };

  useEffect(() => {
    void loadStats();
    void loadPosts();
    void loadDailyStatus();
  }, []);

  const runIngest = async () => {
    setIngesting(true);
    setIngestMessage(null);

    const result = await runBlueskyIngestForWorkspace();
    if (result.error) {
      setIngestMessage(result.error);
    } else {
      setIngestMessage(`Refresh complete. ${result.inserted} posts processed.`);
    }

    await loadPosts();
    await loadStats();
    await loadDailyStatus();
    setIngesting(false);
  };

  const runDailyNow = async () => {
    setRunningDaily(true);
    setDailyMessage(null);

    const result = await runDailyBriefNow();
    if (result.error) {
      setDailyMessage(result.error);
    } else {
      setDailyMessage(
        `Daily run complete. ${result.postsInserted} posts, ${result.briefsCreated} briefs, ${result.emailsSent} emails sent.`
      );
    }

    await loadPosts();
    await loadStats();
    await loadDailyStatus();
    setRunningDaily(false);
  };

  const completedSteps = [
    stats.voices > 0,
    stats.clients > 0,
    stats.voices > 0 && posts.length > 0,
    stats.digests > 0
  ].filter(Boolean).length;

  const nextRunTime = (() => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(8, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toLocaleString();
  })();

  const freshPostCount = posts.filter((post) => {
    const stamp = post.posted_at ?? post.created_at;
    if (!stamp) return false;
    return Date.now() - new Date(stamp).getTime() <= 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tracked voices", value: loading ? "..." : String(stats.voices) },
          { label: "Clients", value: loading ? "..." : String(stats.clients) },
          { label: "Digests", value: loading ? "..." : String(stats.digests) },
          { label: "LinkedIn sync", value: "Email" }
        ].map((stat) => (
          <div key={stat.label} className="card space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{stat.label}</p>
            <p className="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </section>

      {!stats.workspaceReady && (
        <section className="card">
          <p className="text-sm text-slate-600">
            Finishing account setup. Refresh the page in a moment if numbers do not appear yet.
          </p>
        </section>
      )}

      {stats.workspaceReady && completedSteps < 4 && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Getting started</p>
              <h2 className="text-lg font-semibold">Quick setup checklist</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {completedSteps}/4 complete
            </span>
          </div>
          <ol className="space-y-2 text-sm text-slate-700">
            <li className={stats.voices > 0 ? "text-emerald-700" : ""}>{stats.voices > 0 ? "Done:" : "Step 1:"} Add at least one person in Watchlist.</li>
            <li className={stats.clients > 0 ? "text-emerald-700" : ""}>{stats.clients > 0 ? "Done:" : "Step 2:"} Add at least one client profile.</li>
            <li className={stats.voices > 0 && posts.length > 0 ? "text-emerald-700" : ""}>{stats.voices > 0 && posts.length > 0 ? "Done:" : "Step 3:"} Pull latest posts with “Refresh posts now”.</li>
            <li className={stats.digests > 0 ? "text-emerald-700" : ""}>{stats.digests > 0 ? "Done:" : "Step 4:"} Generate first brief in Daily Digest.</li>
          </ol>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Daily brief</p>
              <h2 className="text-xl font-semibold">Most recent posts</h2>
            </div>
            <button
              onClick={runIngest}
              disabled={ingesting}
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white"
            >
              {ingesting ? "Refreshing..." : "Refresh posts now"}
            </button>
          </div>

          {ingestMessage && <p className="text-sm text-slate-500">{ingestMessage}</p>}

          {loadingPosts ? (
            <p className="text-sm text-slate-500">Loading recent posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-slate-500">No posts yet. Click "Refresh posts now" after adding Bluesky sources in Watchlist.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{post.source}</span>
                    <span>{post.posted_at ? new Date(post.posted_at).toLocaleDateString() : "Recent"}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{post.author_name}</p>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{post.content ?? "Post content coming soon."}</p>
                  {(post.author_url || post.post_url) && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                      {post.author_url && (
                        <a href={post.author_url} className="underline">
                          Author
                        </a>
                      )}
                      {post.post_url && (
                        <a href={post.post_url} className="underline">
                          Open post
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold">View full digest</button>
        </div>

        <div className="space-y-6">
          <div className="card space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Watchlist coverage</p>
              <h3 className="text-lg font-semibold">Sources connected</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>LinkedIn alerts via Gmail</li>
              <li>Bluesky daily crawl</li>
              <li>Manual additions welcome</li>
            </ul>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Daily run status</p>
              {dailyStatus ? (
                <>
                  <p>Last run: {new Date(dailyStatus.started_at).toLocaleString()}</p>
                  <p>Status: {dailyStatus.status === "success" ? "Success" : "Failed"}</p>
                  <p>
                    Processed: {dailyStatus.posts_inserted} posts, {dailyStatus.briefs_created} briefs, {dailyStatus.emails_sent} emails
                  </p>
                  {dailyStatus.error_message && <p className="text-rose-600">Error: {dailyStatus.error_message}</p>}
                </>
              ) : (
                <p>No automatic run has completed yet.</p>
              )}
              <p className="mt-2">Next scheduled run: {nextRunTime}</p>
            </div>
            <button
              type="button"
              onClick={runDailyNow}
              disabled={runningDaily}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              {runningDaily ? "Running daily brief..." : "Run full daily brief now"}
            </button>
            {dailyMessage && (
              <p className={`text-xs ${dailyMessage.includes("complete") ? "text-emerald-700" : "text-rose-600"}`}>
                {dailyMessage}
              </p>
            )}
            <div className={`rounded-xl border p-3 text-xs ${freshPostCount === 0 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
              <p className="font-semibold">Freshness check (last 24h)</p>
              <p>{freshPostCount} recent tracked posts found.</p>
              {freshPostCount === 0 && (
                <p className="mt-1">
                  Briefs may be light today. Add more sources or click “Refresh posts now” to pull fresh updates.
                </p>
              )}
            </div>
            <a href="/dashboard/digest" className="inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
              Open daily digest
            </a>
            <p className="text-xs text-slate-500">
              If daily emails do not arrive, double-check SMTP settings in Supabase and set `RESEND_API_KEY` + `ALERT_FROM_EMAIL` in Netlify.
            </p>
          </div>

          <div className="card space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Client notes</p>
              <h3 className="text-lg font-semibold">Most active this week</h3>
            </div>
            <p className="text-sm text-slate-600">
              Aurora Fintech and Nova Health have the most mentions. Consider a proactive POV push on trust and compliance.
            </p>
            <button className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white">Draft a response</button>
          </div>
        </div>
      </section>
    </div>
  );
}
