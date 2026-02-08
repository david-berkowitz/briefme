import Link from "next/link";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-shell min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="dashboard-sidebar p-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
              <img
                src="/briefme-logo.png"
                alt="BriefMe"
                className="h-10 w-auto object-contain mix-blend-multiply"
              />
              <span className="brand-title">BriefMe</span>
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
            <p className="text-sm font-semibold text-slate-700">Next brief</p>
            <p>Tomorrow · 8:00 AM</p>
            <p className="mt-3 text-slate-400">Email: david@youragency.com</p>
          </div>
        </aside>
        <main className="p-6 lg:p-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workspace</p>
              <h1 className="text-2xl font-semibold">Founder Lab</h1>
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
