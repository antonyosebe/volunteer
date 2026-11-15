import Link from "next/link";
import { ApplyPanel } from "@/components/apply-panel";
import { Notice } from "@/components/page-frame";
import { apiUrl } from "@/lib/api";

type Opportunity = {
  title?: string;
  description?: string;
  location?: string | null;
  organisationName?: string | null;
  categoryName?: string | null;
  isRemote?: boolean;
  timeCommitment?: string | null;
  volunteerCount?: number | null;
  isPaid?: boolean;
  startsOn?: string | null;
  endsOn?: string | null;
  deadline?: string | null;
};

export async function OpportunityDetail({ id, listHref, flush = false }: { id: string; listHref: string; flush?: boolean }) {
  const loaded = await loadOpportunity(id);
  const opportunity = loaded.opportunity;
  const place = opportunity?.isRemote && !opportunity.location ? "Remote" : opportunity?.isRemote && opportunity.location ? `${opportunity.location} · Remote` : opportunity?.location;
  const facts = [
    opportunity?.categoryName,
    place,
    opportunity?.timeCommitment,
    opportunity?.volunteerCount ? `${opportunity.volunteerCount} volunteers` : null,
    opportunity?.isPaid ? "Paid" : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div className={flush ? "px-6 py-6" : "mx-auto max-w-6xl px-4 py-10"}>
      <Link href={listHref} className="text-sm font-semibold text-teal">
        All opportunities
      </Link>
      {loaded.error ? (
        <div className="mt-6">
          <Notice>{loaded.error}</Notice>
        </div>
      ) : null}
      {opportunity ? (
        <>
          <header className="mt-4 max-w-3xl">
            {opportunity.organisationName ? <p className="text-sm font-medium uppercase tracking-[0.16em] text-orange">{opportunity.organisationName}</p> : null}
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-teal">{opportunity.title}</h1>
            {facts.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {facts.map((fact) => (
                  <li key={fact} className="rounded-full bg-white px-3 py-1 text-sm text-ink/70">
                    {fact}
                  </li>
                ))}
              </ul>
            ) : null}
          </header>
          <article className="mt-8 grid overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-2">
            <div className="p-5 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink/40">About this opportunity</h2>
              <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-ink">{opportunity.description}</p>
              {opportunity.startsOn || opportunity.endsOn || opportunity.deadline ? (
                <dl className="mt-6 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
                  {opportunity.startsOn ? <Fact label="Starts" value={showDate(opportunity.startsOn)} /> : null}
                  {opportunity.endsOn ? <Fact label="Ends" value={showDate(opportunity.endsOn)} /> : null}
                  {opportunity.deadline ? <Fact label="Apply by" value={showDate(opportunity.deadline)} /> : null}
                </dl>
              ) : null}
            </div>
            <div className="flex border-t border-line p-5 sm:p-6 lg:border-t-0 lg:border-l">
              <ApplyPanel opportunityId={id} deadline={opportunity.deadline} returnPath={`${listHref}/${id}`} />
            </div>
          </article>
        </>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-ink/40">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function showDate(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

async function loadOpportunity(id: string) {
  try {
    const response = await fetch(`${apiUrl}/api/opportunities/${id}`, { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as (Opportunity & { message?: string }) | null;
    if (!response.ok) return { opportunity: null, error: body?.message ?? "That opportunity is not public." };
    return { opportunity: body, error: null };
  } catch {
    return { opportunity: null, error: "The Volunteer API is not running yet." };
  }
}
