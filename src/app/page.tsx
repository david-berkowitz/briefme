export default function Home() {
  return (
    <main>
      <header className="section">
        <div className="container flex flex-col gap-10">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/briefme-logo.png"
                alt="BriefMe"
                className="h-10 w-auto object-contain"
              />
              <span className="text-lg font-semibold tracking-tight text-slate-700">
                BriefMe
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium">
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="/auth" className="rounded-full bg-ink px-5 py-2 text-white">Open app</a>
            </div>
          </nav>
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
            <span className="badge">Daily intelligence</span>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl" style={{ fontFamily: "var(--font-display)" }}>
              Track the voices that shape your narrative.
            </h1>
              <p className="text-lg text-slate-600 md:text-xl">
                SignalRoom watches key people across LinkedIn and Bluesky and delivers daily briefs with client-ready takeaways.
                No noise. Just what matters.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="/auth" className="rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white shadow-glow">
                  Request early access
                </a>
                <a href="#demo" className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold">
                  See sample brief
                </a>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <span>LinkedIn + Bluesky</span>
                <span>Daily digests</span>
                <span>Client-ready insights</span>
              </div>
            </div>
            <div className="relative">
              <div className="pulse" />
              <div className="card space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Today</p>
                    <p className="text-lg font-semibold">Morning Brief</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">25 tracked voices</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold">A fintech CEO posts about AI risk</p>
                    <p className="text-sm text-slate-600">Client angle: highlight your governance framework and compliance edge.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold">A policy leader cites regulatory headwinds</p>
                    <p className="text-sm text-slate-600">Client angle: propose a POV piece on proactive collaboration.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Next brief at 8:00 AM</span>
                  <span className="font-semibold text-ember">View all alerts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="features" className="section">
        <div className="container space-y-10">
          <div className="flex flex-col gap-4">
            <span className="badge">Built for PR teams</span>
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              Daily context without the chaos
            </h2>
            <p className="max-w-2xl text-slate-600">
              SignalRoom turns influencer activity into clear, client-ready insights. Set watchlists, define client context, and get sharp takeaways every morning.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Watchlists that scale",
                body: "Track 25-50 people today. Scale to hundreds when you are ready for paid tiers."
              },
              {
                title: "Client-focused insights",
                body: "Each alert includes what happened, why it matters, and the best next move for a specific client."
              },
              {
                title: "Daily calm",
                body: "Receive one daily digest. No noise, no endless scroll, just priority signals."
              }
            ].map((item) => (
              <div key={item.title} className="card space-y-3">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="section hero-gradient">
        <div className="container grid gap-10 lg:grid-cols-3">
          {[
            {
              step: "01",
              title: "Add your people",
              body: "Drop in LinkedIn profiles and Bluesky handles. SignalRoom organizes by client and theme."
            },
            {
              step: "02",
              title: "Set client context",
              body: "Define positioning, vulnerabilities, and strategic angles for each client."
            },
            {
              step: "03",
              title: "Get daily takeaways",
              body: "Every morning, receive a concise brief with recommended responses."
            }
          ].map((item) => (
            <div key={item.step} className="glass p-6 text-ink">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">{item.step}</p>
              <h3 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-slate-700">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="section">
        <div className="container grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <span className="badge">Sample alert</span>
            <h2 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Client-ready in 90 seconds
            </h2>
            <p className="text-slate-600">
              A daily roundup that reads like a strategist already took notes. Deliverables include talking points, risks, and recommended outreach ideas.
            </p>
          </div>
          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Client</p>
                <p className="text-lg font-semibold">Aurora Fintech</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Daily digest</span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">What happened</p>
                <p className="text-sm text-slate-600">Two regulators posted about open banking guardrails. One highlighted data portability risks.</p>
              </div>
              <div>
                <p className="text-sm font-semibold">Why it matters</p>
                <p className="text-sm text-slate-600">Competitors will position themselves as safety-first. We should counter with Aurora's compliance audits.</p>
              </div>
              <div>
                <p className="text-sm font-semibold">Recommended move</p>
                <p className="text-sm text-slate-600">Pitch a short LinkedIn post outlining Aurora's trust framework and invite a panel discussion.</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Includes 12 sources</span>
              <span className="font-semibold text-ember">Export as PDF</span>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="section">
        <div className="container grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <span className="badge">Pricing</span>
            <h2 className="text-3xl font-semibold md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              Start free, go pro for the price of coffee
            </h2>
            <p className="text-slate-600">
              Keep a small watchlist for free. Unlock daily briefs and bigger coverage for just $5/month.
            </p>
          </div>
          <div className="grid gap-6">
            <div className="card space-y-4">
              <div>
                <p className="text-sm text-slate-500">Free</p>
                <p className="text-4xl font-semibold">$0</p>
                <p className="text-sm text-slate-500">For solo exploration</p>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>Weekly digest</li>
                <li>Up to 5 tracked voices</li>
                <li>1 client profile</li>
                <li>Basic takeaways</li>
              </ul>
              <a href="/auth" className="block rounded-full border border-slate-300 px-6 py-3 text-center text-sm font-semibold">
                Start free
              </a>
            </div>
            <div className="card space-y-4">
              <div>
                <p className="text-sm text-slate-500">Pro</p>
                <p className="text-4xl font-semibold">$5/mo</p>
                <p className="text-sm text-slate-500">Early access pricing</p>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>Daily email digest</li>
                <li>Up to 50 tracked voices</li>
                <li>Unlimited client profiles</li>
                <li>Exportable briefs</li>
              </ul>
              <a href="/auth" className="block rounded-full bg-ink px-6 py-3 text-center text-sm font-semibold text-white">
                Join the waitlist
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="section">
        <div className="container flex flex-col items-start justify-between gap-6 border-t border-slate-200 pt-8 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/briefme-logo.png"
                alt="BriefMe"
                className="h-8 w-auto object-contain"
              />
              <p className="text-lg font-semibold">BriefMe</p>
            </div>
            <p className="text-sm text-slate-500">Daily intelligence for modern comms.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="/auth">App</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
