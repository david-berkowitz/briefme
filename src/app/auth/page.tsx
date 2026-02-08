"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const supabase = getSupabase();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    setStatus(error ? "error" : "sent");
  };

  return (
    <main className="section">
      <div className="container grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="/briefme-logo.png"
              alt="BriefMe"
              className="h-10 w-auto object-contain"
            />
            <span className="text-lg font-semibold text-slate-700">BriefMe</span>
          </div>
          <span className="badge">Welcome back</span>
          <h1 className="text-4xl font-semibold md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
            Sign in to your briefings
          </h1>
          <p className="text-slate-600">
            Get daily digests, client takeaways, and your personalized watchlist delivered straight to your inbox.
          </p>
          {!supabase && (
            <p className="text-sm text-amber-600">
              Add your Supabase keys in a local `.env.local` file to enable magic links.
            </p>
          )}
        </div>

        <div className="card space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Email login</p>
            <h2 className="text-xl font-semibold">Magic link access</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="you@agency.com"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
              disabled={status === "loading" || !supabase}
            >
              {status === "loading" ? "Sending..." : "Send magic link"}
            </button>
          </form>
          {status === "sent" && (
            <p className="text-sm text-emerald-600">Check your inbox for the login link.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-rose-600">Something went wrong. Try again.</p>
          )}
        </div>
      </div>
    </main>
  );
}
