"use client";

import { useEffect, useState } from "react";
import { fetchDashboardStats, fetchRecentPosts, runBlueskyIngestForWorkspace } from "@/lib/data";

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

  useEffect(() => {
    void loadStats();
    void loadPosts();
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
    setIngesting(false);
  };

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

      {stats.workspaceReady && stats.voices === 0 && stats.clients === 0 && (
        <section className="card space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Getting started</p>
          <h2 className="text-lg font-semibold">New account checklist</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Add 5-10 voices in Watchlist.</li>
            <li>Add at least one client in Clients with narratives and risks.</li>
            <li>Click “Refresh posts now” to pull the latest activity.</li>
            <li>Open Daily Digest and click “Generate today’s briefs”.</li>
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
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">Connect inbox</button>
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
