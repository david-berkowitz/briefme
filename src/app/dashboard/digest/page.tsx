const highlights = [
  {
    title: "Regulators emphasize audit-ready AI systems",
    source: "LinkedIn · Dr. Maya Patel",
    takeaway: "Reinforce Aurora Fintech's audit playbook and publish a transparency checklist."
  },
  {
    title: "Bluesky thread on faster onboarding for SMBs",
    source: "Bluesky · Jordan Ruiz",
    takeaway: "Pitch PulsePay's onboarding story with a 60-second demo video."
  },
  {
    title: "Reporter asks for examples of privacy-first health tech",
    source: "LinkedIn · Evelyn Sharp",
    takeaway: "Offer Nova Health as a case study, with metrics on consent rates."
  }
];

export default function DigestPage() {
  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Daily digest</p>
            <h2 className="text-xl font-semibold">Wednesday briefing</h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
              Export PDF
            </button>
            <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              Email team
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Coverage</p>
            <p className="mt-2 text-2xl font-semibold">12 posts</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Clients</p>
            <p className="mt-2 text-2xl font-semibold">3 active</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Response needed</p>
            <p className="mt-2 text-2xl font-semibold">2 high</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Client-ready takeaways</h3>
        <div className="space-y-4">
          {highlights.map((item) => (
            <div key={item.title} className="card space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{item.source}</span>
                <span>Priority: High</span>
              </div>
              <p className="text-base font-semibold text-slate-900">{item.title}</p>
              <p className="text-sm text-slate-600">{item.takeaway}</p>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold">
                  Draft response
                </button>
                <button className="rounded-full bg-ember px-4 py-2 text-xs font-semibold text-white">
                  Share with client
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
