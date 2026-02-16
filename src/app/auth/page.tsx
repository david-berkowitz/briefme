"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const supabase = getSupabase();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (typeof window === "undefined" ? "" : window.location.origin);
  const redirectTarget = `${siteUrl}/auth/callback`;
  const upgradeEmail = "dberkowitz@gmail.com";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setErrorMessage("Supabase is not connected yet.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const existing = await supabase.auth.getUser();
    if (existing.data.user) {
      router.replace("/dashboard");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTarget
      }
    });

    if (error) {
      setErrorMessage(error.message);
    }
    setStatus(error ? "error" : "sent");
  };

  return (
    <main className="section">
      <div className="container grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="/briefme-logo-wide.png"
              alt="BriefMe"
              className="h-20 w-auto object-contain md:h-24"
            />
          </div>
          <span className="badge">Beta access</span>
          <h1 className="text-4xl font-semibold md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
            Join the BriefMe beta
          </h1>
          <p className="text-slate-600">
            Start free and track up to 10 people. You can add multiple links per person (like LinkedIn + Bluesky)
            inside one profile.
          </p>
          <p className="text-sm text-slate-500">
            We create a private workspace for every login automatically.
          </p>
          <p className="text-sm text-slate-500">
            Need a bigger limit?{" "}
            <a className="font-semibold underline" href={`mailto:${upgradeEmail}?subject=BriefMe%20Upgrade%20Request`}>
              Contact David for an upgrade
            </a>
            .
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
            <div className="space-y-2 text-sm text-emerald-700">
              <p>Check your inbox for the login link.</p>
              <p className="text-xs text-slate-500">Link target: {redirectTarget}</p>
            </div>
          )}
          {status === "error" && (
            <div className="space-y-2 text-sm text-rose-600">
              <p>Could not send or use magic link: {errorMessage || "Something went wrong."}</p>
              <p className="text-xs text-slate-500">
                This is usually a Supabase URL setting issue, not Gmail linking.
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500">
            First time here? Use your email above and we’ll send your secure sign-in link.
          </p>
        </div>
      </div>
    </main>
  );
}
