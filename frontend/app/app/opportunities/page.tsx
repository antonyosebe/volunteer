"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

type Row = {
  opportunityId: string;
  title: string;
  status: string;
  location: string | null;
  isRemote: boolean;
  categoryName: string | null;
};

type Applicant = {
  opportunityId: string;
};

const labels: Record<string, string> = {
  draft: "Draft",
  published: "Posted",
  unpublished: "Unpublished",
  closed: "Closed",
};

export default function Page() {
  const session = useSession();
  const organisation = session?.clientType === "org_admin" || session?.clientType === "org_member";
  const [rows, setRows] = useState<Row[]>([]);
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const categories = [...new Set(rows.map((row) => row.categoryName).filter((name): name is string => Boolean(name)))].sort();
  const shown = rows.filter((row) => (statusFilter === "all" || row.status === statusFilter) && (category === "all" || row.categoryName === category));
  const posted = rows.filter((row) => row.status === "published");
  const counts: Record<string, number> = {
    all: rows.length,
    draft: rows.filter((row) => row.status === "draft").length,
    published: posted.length,
    unpublished: rows.filter((row) => row.status === "unpublished").length,
    closed: rows.filter((row) => row.status === "closed").length,
  };
  const showPlaces = (statusFilter === "all" || statusFilter === "published") && category === "all";
  const slots: Array<Row | null> = showPlaces ? [0, 1, 2].map((index) => posted[index] ?? null) : [];
  const placed = new Set(slots.flatMap((row) => (row ? [row.opportunityId] : [])));
  const rest = shown.filter((row) => !placed.has(row.opportunityId));

  useEffect(() => {
    if (!organisation || !session?.clientId) return;
    let ignore = false;
    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/opportunities/mine/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as Row[] | { message?: string } | null;
        if (ignore) return;
        if (!response.ok || !Array.isArray(body)) {
          setMessage((body as { message?: string } | null)?.message ?? "Could not read your opportunities.");
          return;
        }
        setRows(body);
        const received = await fetch(`${apiUrl}/api/applications/received/${session?.clientId}`);
        const applicants = (await received.json().catch(() => null)) as Applicant[] | null;
        if (!ignore && received.ok && Array.isArray(applicants)) {
          const counts: Record<string, number> = {};
          for (const applicant of applicants) {
            counts[applicant.opportunityId] = (counts[applicant.opportunityId] ?? 0) + 1;
          }
          setApplicantCounts(counts);
        }
        setMessage(null);
      } catch {
        if (!ignore) setMessage("The Volunteer API is not running yet.");
      } finally {
        if (!ignore) setReady(true);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [organisation, session?.clientId]);

  async function setStatus(opportunityId: string, status: string) {
    if (!session?.clientId) return;
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/opportunities/mine/${session.clientId}/${opportunityId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Could not update that opportunity.");
        return;
      }
      setRows((current) => current.map((row) => (row.opportunityId === opportunityId ? { ...row, status } : row)));
      setMessage(body?.message ?? "Opportunity updated.");
    } catch {
      setMessage("The Volunteer API is not running yet.");
    }
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Opportunities</span>
      </p>
      {!session ? (
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/login" className="font-semibold text-teal underline">
            Log in
          </Link>{" "}
          to post an opportunity.
        </p>
      ) : null}
      {session && !organisation ? <p className="mt-4 text-sm text-ink/60">Only an organisation can post opportunities.</p> : null}
      {organisation ? (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-teal">Opportunities</h1>
            <p className="mt-1 text-sm text-ink/55">{ready ? roomLeft(posted.length) : "Reading your listings."}</p>
          </div>
          <Link href="/app/opportunities/new" className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange/90">
            New opportunity
          </Link>
        </div>
      ) : null}
      {message ? <p className="mt-4 text-sm font-medium text-teal">{message}</p> : null}
      {organisation ? (
        <section className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line">
            <div className="flex flex-wrap gap-x-5" role="group" aria-label="Status">
              {statusOptions.map((option) => {
                const active = statusFilter === option.value;
                return (
                  <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)} aria-pressed={active} className={`border-b-2 pb-2 text-sm ${active ? "border-orange font-semibold text-ink" : "border-transparent font-medium text-ink/45 hover:text-ink"}`}>
                    {option.label}
                    <span className="ml-1.5 text-xs text-ink/35">{ready ? counts[option.value] : ""}</span>
                  </button>
                );
              })}
            </div>
            <label className="mb-2 flex items-center gap-2 text-sm text-ink/60">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-orange"
              >
                <option value="all">All</option>
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {ready && shown.length === 0 && slots.length === 0 ? <p className="mt-6 text-sm text-ink/60">{rows.length === 0 ? "You have not created an opportunity yet." : "No opportunities match this filter."}</p> : null}
          {slots.length > 0 ? (
            <ul className="mt-5 grid items-stretch gap-4 md:grid-cols-3">
              {slots.map((row, index) =>
                row ? (
                  <Poster key={row.opportunityId} row={row} applicantCount={applicantCounts[row.opportunityId] ?? 0} onStatus={setStatus} featured />
                ) : (
                  <li key={`open-${index}`} className="relative flex min-h-72 flex-col justify-between overflow-hidden rounded-3xl border border-line bg-white p-5">
                    <span className="pointer-events-none absolute -right-2 -top-4 font-script text-8xl leading-none text-teal/10" aria-hidden>
                      {index + 1}
                    </span>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink/35">Open</p>
                    <div>
                      <p className="max-w-[12rem] text-xl font-semibold leading-snug text-teal">This place is free.</p>
                      <Link href="/app/opportunities/new" className="mt-4 inline-block text-sm font-semibold text-orange">
                        Fill this place
                      </Link>
                    </div>
                  </li>
                ),
              )}
            </ul>
          ) : null}
          {rest.length > 0 ? (
            <ul className={`grid items-stretch gap-4 md:grid-cols-3 ${slots.length > 0 ? "mt-4" : "mt-5"}`}>
              {rest.map((row) => (
                <Poster key={row.opportunityId} row={row} applicantCount={applicantCounts[row.opportunityId] ?? 0} onStatus={setStatus} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Poster({ row, applicantCount, onStatus, featured = false }: { row: Row; applicantCount: number; onStatus: (opportunityId: string, status: string) => void; featured?: boolean }) {
  const place = row.isRemote && !row.location ? "Remote" : row.isRemote && row.location ? `${row.location} · Remote` : row.location;
  const applicantsLabel = applicantCount === 1 ? "1 applicant" : `${applicantCount} applicants`;
  return (
    <li className={`flex min-h-72 flex-col justify-between rounded-3xl p-5 ${featured ? "bg-teal text-white" : "border border-line bg-white text-ink"}`}>
      <div>
        <p className={`text-xs font-medium uppercase tracking-[0.18em] ${featured ? "text-orange" : "text-ink/40"}`}>{labels[row.status] ?? row.status}</p>
        <h2 className={`mt-4 text-2xl font-semibold leading-tight ${featured ? "text-white" : "text-teal"}`}>{row.title}</h2>
      </div>
      <div>
        <p className={`text-sm ${featured ? "text-white/75" : "text-ink/55"}`}>{row.categoryName || "No category"}</p>
        <p className={`mt-0.5 text-sm ${featured ? "text-white/75" : "text-ink/55"}`}>{place || "No location"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/app/opportunities/${row.opportunityId}/applicants`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${applicantCount > 0 ? "bg-orange text-white" : featured ? "bg-white/10 text-white" : "border border-line text-ink"}`}>
            {applicantsLabel}
          </Link>
          <Link href={`/app/opportunities/${row.opportunityId}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${featured ? "bg-white text-teal" : "border border-line text-ink"}`}>
            Edit
          </Link>
          {row.status === "published" ? (
            <button type="button" onClick={() => onStatus(row.opportunityId, "unpublished")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${featured ? "bg-white/10 text-white" : "border border-line text-ink"}`}>
              Unpublish
            </button>
          ) : (
            <button type="button" onClick={() => onStatus(row.opportunityId, "published")} className="rounded-full bg-action px-3 py-1.5 text-sm font-semibold text-white hover:bg-action/90">
              Post
            </button>
          )}
          {row.status !== "closed" ? (
            <button type="button" onClick={() => onStatus(row.opportunityId, "closed")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${featured ? "bg-white/10 text-white" : "border border-line text-ink/60"}`}>
              Close
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

const statusOptions = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Posted" },
  { value: "unpublished", label: "Unpublished" },
  { value: "closed", label: "Closed" },
];

function roomLeft(postedCount: number) {
  const left = Math.max(0, 3 - postedCount);
  if (postedCount === 0) return "Nothing is posted yet. Three places are open.";
  if (left === 0) return "All three places are filled. Unpublish one before posting another.";
  if (left === 1) return "One place is still open.";
  return `${left} places are still open.`;
}
