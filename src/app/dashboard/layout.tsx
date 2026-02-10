"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSessionUser, resolveWorkspace } from "@/lib/data";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [userEmail, setUserEmail] = useState("you@briefme.info");

  useEffect(() => {
    const bootstrap = async () => {
      const { user } = await fetchSessionUser();
      if (!user) {
        router.replace("/auth");
        return;
      }

      setUserEmail(user.email ?? "you@briefme.info");

      const { error } = await resolveWorkspace();
      if (error) {
        router.replace("/auth");
        return;
      }

      const name =
        user.user_metadata?.full_name && String(user.user_metadata.full_name).trim().length > 0
          ? `${String(user.user_metadata.full_name).trim()}'s Workspace`
          : "My Workspace";

      setWorkspaceName(name);
      setReady(true);
    };

    void bootstrap();
  }, [router]);

  if (!ready) {
    return (
      <div className="dashboard-shell min-h-screen p-10">
        <div className="card max-w-xl">
          <p className="text-sm text-slate-600">Loading your private workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="dashboard-sidebar p-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
              <img
                src="/briefme-logo.png"
                alt="BriefMe"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <span className="chip">
              Founder
            </span>
          </div>
          <nav className="mt-10 space-y-2 text-sm">
            {[
              { href: "/dashboard", label: "Overview" },
              { href: "/dashboard/watchlist", label: "Watchlist" },
              { href: "/dashboard/clients", label: "Clients" },
              { href: "/dashboard/digest", label: "Daily Digest" }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-4 py-3 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="text-sm font-semibold text-slate-700">Your private workspace</p>
            <p>Data is scoped to your login.</p>
            <p className="mt-3 text-slate-400">Email: {userEmail}</p>
          </div>
        </aside>
        <main className="p-6 lg:p-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workspace</p>
              <h1 className="text-2xl font-semibold">{workspaceName}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-secondary px-4 py-2 text-sm">
                Add voice
              </button>
              <button className="btn-primary px-4 py-2 text-sm">
                New brief
              </button>
            </div>
          </header>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
