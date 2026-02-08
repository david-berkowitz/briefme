import Link from "next/link";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-fog">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
              <img
                src="/briefme-logo.png"
                alt="BriefMe"
                className="h-8 w-auto object-contain"
              />
              <span>BriefMe</span>
            </Link>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
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
                className="block rounded-xl px-4 py-3 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
              <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
                Add voice
              </button>
              <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
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
