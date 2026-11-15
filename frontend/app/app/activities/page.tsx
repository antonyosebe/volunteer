import Link from "next/link";

export default function Page() {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Activities</span>
      </p>
      <section className="mt-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Activities</h1>
        <p className="mt-1 text-sm text-ink/60">Opportunities you have joined.</p>
        <div className="mt-6 rounded-xl border border-line">
          <div className="grid grid-cols-[1.4fr_0.8fr] border-b border-line px-4 py-3 text-xs font-medium tracking-wide text-ink/45 uppercase">
            <span>Opportunity</span>
            <span>Status</span>
          </div>
          <p className="px-4 py-8 text-sm text-ink/55">
            Nothing here yet.{" "}
            <Link href="/app/discover" className="font-semibold text-teal underline">
              Discover opportunities
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
