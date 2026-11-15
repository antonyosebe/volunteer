"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { initials, useSession } from "@/lib/session";

type Profile = {
  fullName: string;
  email: string;
  phone: string | null;
  workplace: string | null;
  country: string | null;
  city: string | null;
  availability: string | null;
  photoPath: string | null;
};

const detailCount = 6;
const monthApplications = [0, 0, 0, 0];
const monthActivities = [0, 0, 0, 0, 0, 0, 0];

export default function Page() {
  const session = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const weekIndex = useWeekIndex();
  const firstName = session?.fullName?.trim().split(/\s+/)[0];
  const organisationAccount = session?.clientType === "org_admin" || session?.clientType === "org_member";
  const place = [profile?.city, profile?.country].filter(Boolean).join(", ");
  const checks = [
    { done: Boolean(profile?.fullName || session?.fullName), label: "Name" },
    { done: Boolean(profile?.email || session?.email), label: "Email" },
    { done: Boolean(profile?.phone), label: "Phone" },
    { done: Boolean(place), label: "Location" },
    { done: Boolean(profile?.availability), label: "Availability" },
    { done: Boolean(profile?.photoPath), label: "Photo" },
  ];
  const doneCount = checks.filter((item) => item.done).length;
  const waiting = Boolean(session?.clientId) && !profileReady;
  const score = waiting ? null : Math.round((doneCount / detailCount) * 100);
  const openItems = checks.filter((item) => !item.done);
  const photo = profile?.photoPath ? `${apiUrl}/uploads/${profile.photoPath}` : null;

  useEffect(() => {
    if (!session?.clientId || organisationAccount) return;
    let ignore = false;
    async function load() {
      setProfileReady(false);
      try {
        const response = await fetch(`${apiUrl}/api/profile/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as Profile | null;
        if (ignore) return;
        setProfile(response.ok && body ? body : null);
      } catch {
        if (!ignore) setProfile(null);
      } finally {
        if (!ignore) setProfileReady(true);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [session?.clientId, organisationAccount]);

  if (session?.clientType === "admin") {
    return <AdminOverview />;
  }

  if (organisationAccount) {
    return <OrganisationOverview />;
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Dashboard</span>
      </p>

      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{firstName ? `Welcome back, ${firstName}` : "Dashboard"}</h1>
        <p className="mt-1 text-sm text-ink/55">Your profile, applications, and activities in one place.</p>
      </header>

      <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[1.4fr_0.72fr]">
        <section className="flex flex-col justify-between rounded-2xl bg-teal p-4 text-white sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Profile</h2>
            <Link href="/app/profile" className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/15">
              Open profile
            </Link>
          </div>
          {session ? (
            <>
              <div className="mt-4 flex items-center gap-4">
                {photo ? (
                  <img src={photo} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-sm font-semibold">
                    {initials(session.fullName)}
                  </span>
                )}
                <div>
                  <p className="text-3xl font-semibold tracking-tight">{score === null ? "—" : `${score}%`}</p>
                  <p className="text-xs text-white/70">Profile score</p>
                </div>
              </div>
              <div className="mt-4 border-t border-white/15 pt-3">
                <div className="flex items-end justify-between gap-4">
                  <p className="text-xl font-semibold">{waiting ? "—" : `${doneCount}/${detailCount}`}</p>
                  <p className="max-w-xs text-right text-sm leading-5 text-white/75">
                    {waiting ? "Reading your profile." : place ? `You can help in ${place}.` : "Add a city and country when you are ready."}
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20" role="meter" aria-label="Profile details added" aria-valuemin={0} aria-valuemax={detailCount} aria-valuenow={waiting ? 0 : doneCount}>
                  <div className="h-full rounded-full bg-white" style={{ width: waiting ? "0%" : `${score}%` }} />
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4">
              <p className="max-w-sm text-sm leading-6 text-white/75">Sign in to see your profile score and the details still open.</p>
              <Link href="/login" className="mt-6 inline-flex rounded-lg bg-white px-3 py-2 text-sm font-semibold text-teal">
                Log in
              </Link>
            </div>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Metric href="/app/applications" label="Applications" value="0" note="None sent yet" color="#123c38" values={monthActivities} />
          <Metric href="/app/activities" label="Activities" value="0" note="None joined yet" color="#f26b21" values={monthActivities} />
        </div>
      </div>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[1.4fr_0.72fr]">
        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Applications this month</h2>
            <p className="flex items-center gap-2 text-sm text-ink/55">
              <span className="h-2 w-2 rounded-full bg-teal" aria-hidden />
              Sent
            </p>
          </div>
          <MonthChart values={monthApplications} marker={weekIndex} />
          <p className="mt-2 text-sm text-ink/50">No applications have been sent this month.</p>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Still open</h2>
          {session ? (
            waiting ? (
              <p className="mt-4 text-sm text-ink/55">Reading your profile.</p>
            ) : openItems.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-ink/60">Every profile detail is in place.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {openItems.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium text-ink">{item.label}</span>
                    <span className="text-ink/40">Not added</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink/60">
              <Link href="/login" className="font-semibold text-teal underline">
                Log in
              </Link>{" "}
              to see what is still open.
            </p>
          )}
          <Link href="/app/profile" className="mt-3 inline-flex text-sm font-semibold text-teal underline">
            Open profile
          </Link>
        </section>
      </div>
    </div>
  );
}

type AdminSummary = {
  volunteers: number;
  organisations: number;
  pending: number;
  approved: number;
};

type AdminOrganisation = {
  organisationId: string;
  name: string;
  email: string;
  status: string;
};

type AdminWeek = {
  weekIndex: number;
  volunteers: number;
  organisations: number;
};

function AdminOverview() {
  const session = useSession();
  const weekIndex = useWeekIndex();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [rows, setRows] = useState<AdminOrganisation[]>([]);
  const [weeks, setWeeks] = useState<AdminWeek[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [summaryResponse, listResponse, weekResponse] = await Promise.all([
          fetch(`${apiUrl}/api/admin/summary`),
          fetch(`${apiUrl}/api/admin/organisations`),
          fetch(`${apiUrl}/api/admin/weeks`),
        ]);
        const summaryBody = (await summaryResponse.json().catch(() => null)) as AdminSummary | null;
        const listBody = (await listResponse.json().catch(() => null)) as AdminOrganisation[] | null;
        const weekBody = (await weekResponse.json().catch(() => null)) as AdminWeek[] | null;
        if (ignore) return;
        if (summaryResponse.ok && summaryBody) setSummary(summaryBody);
        if (listResponse.ok && Array.isArray(listBody)) setRows(listBody);
        if (weekResponse.ok && Array.isArray(weekBody)) setWeeks(weekBody);
      } catch {
        if (!ignore) setSummary(null);
      } finally {
        if (!ignore) setReady(true);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const pending = summary?.pending ?? 0;
  const headline = !ready ? "Reading the platform." : pending === 0 ? "Nothing is waiting." : pending === 1 ? "One organisation is waiting." : `${pending} organisations are waiting.`;
  const volunteerWeeks = weeks.length === 4 ? weeks.map((week) => week.volunteers) : [0, 0, 0, 0];
  const organisationWeeks = weeks.length === 4 ? weeks.map((week) => week.organisations) : [0, 0, 0, 0];
  const joined = volunteerWeeks.map((value, index) => value + organisationWeeks[index]);
  const chartMax = Math.max(1, ...joined);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Dashboard</span>
      </p>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back, {session?.fullName || "Admin"}</h1>
        <p className="mt-1 text-sm text-ink/55">Who is waiting, who joined, and who is already approved.</p>
      </header>
      <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[1.4fr_0.72fr]">
        <section className="flex flex-col justify-between rounded-2xl bg-teal p-4 text-white sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Today</h2>
            <Link href="/app/approvals" className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/15">
              Open approvals
            </Link>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{headline}</p>
          <p className="mt-4 border-t border-white/15 pt-3 text-sm leading-6 text-white/75">{adminDetail(summary, rows, ready)}</p>
        </section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Metric href="/app/approvals" label="Organisations" value={summary ? String(summary.organisations) : "—"} note={monthNote(organisationWeeks)} color="#123c38" values={organisationWeeks} max={Math.max(1, ...organisationWeeks)} />
          <Metric href="/app/approvals" label="Volunteers" value={summary ? String(summary.volunteers) : "—"} note={monthNote(volunteerWeeks)} color="#f26b21" values={volunteerWeeks} max={Math.max(1, ...volunteerWeeks)} />
        </div>
      </div>
      <section className="mt-3 rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">People who joined this month</h2>
          <p className="flex items-center gap-2 text-sm text-ink/55">
            <span className="h-2 w-2 rounded-full bg-teal" aria-hidden />
            Joined
          </p>
        </div>
        <MonthChart values={joined} marker={weekIndex} max={chartMax} label={joinedCaption(joined, ready)} />
        <p className="mt-2 text-sm text-ink/50">{joinedCaption(joined, ready)}</p>
      </section>
    </div>
  );
}

function monthNote(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return "None this month";
  if (total === 1) return "1 this month";
  return `${total} this month`;
}

function joinedCaption(values: number[], ready: boolean) {
  if (!ready) return "Reading who joined this month.";
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return "No one has joined this month.";
  const peak = values.indexOf(Math.max(...values));
  if (total === 1) return `1 person joined, in week ${peak + 1}.`;
  return `${total} people joined. The busiest point is week ${peak + 1}.`;
}

function adminDetail(summary: AdminSummary | null, rows: AdminOrganisation[], ready: boolean) {
  if (!ready || !summary) return "Reading who has joined.";
  const approved = rows.filter((row) => row.status === "approved");
  const approvedLine =
    approved.length === 0 ? "No organisation is public yet" : approved.length === 1 ? `${approved[0].name} is approved` : `${approved.length} organisations are approved`;
  const volunteerLine = summary.volunteers === 1 ? "1 volunteer has joined" : `${summary.volunteers} volunteers have joined`;
  return `${approvedLine}, and ${volunteerLine}.`;
}

type Organisation = {
  organisationId: string;
  name: string;
  email: string;
  country: string | null;
  city: string | null;
  status: string;
  memberRole: string;
};

function OrganisationOverview() {
  const session = useSession();
  const weekIndex = useWeekIndex();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [ready, setReady] = useState(false);
  const [listed, setListed] = useState<number | null>(null);
  const [posted, setPosted] = useState(0);
  const [received, setReceived] = useState<number | null>(null);
  const [receivedWeeks, setReceivedWeeks] = useState<number[]>([0, 0, 0, 0]);
  const name = organisation?.name || session?.fullName || "Your organisation";
  const place = [organisation?.city, organisation?.country].filter(Boolean).join(", ");
  const pending = (organisation?.status ?? "pending") !== "approved";

  useEffect(() => {
    if (!session?.clientId) return;
    let ignore = false;
    async function load() {
      setReady(false);
      try {
        const response = await fetch(`${apiUrl}/api/organisation/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as Organisation | null;
        if (ignore) return;
        setOrganisation(response.ok && body?.name ? body : null);
        const listings = await fetch(`${apiUrl}/api/opportunities/mine/${session?.clientId}`);
        const rows = (await listings.json().catch(() => null)) as { status?: string }[] | null;
        if (!ignore && listings.ok && Array.isArray(rows)) {
          setListed(rows.length);
          setPosted(rows.filter((row) => row.status === "published").length);
        }
        const applications = await fetch(`${apiUrl}/api/applications/received/${session?.clientId}`);
        const applicants = (await applications.json().catch(() => null)) as { submittedAt?: string }[] | null;
        if (!ignore && applications.ok && Array.isArray(applicants)) {
          const weeks = weeksThisMonth(applicants.map((row) => row.submittedAt ?? ""));
          setReceived(applicants.length);
          setReceivedWeeks(weeks);
        }
      } catch {
        if (!ignore) setOrganisation(null);
      } finally {
        if (!ignore) setReady(true);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [session?.clientId]);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Dashboard</span>
      </p>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back, {name}</h1>
        <p className="mt-1 text-sm text-ink/55">Your organisation, the opportunities you list, and the applications you receive.</p>
      </header>

      <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[1.4fr_0.72fr]">
        <section className="flex flex-col justify-between rounded-2xl bg-teal p-4 text-white sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Organisation</h2>
            <Link href="/app/organisation" className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium hover:bg-white/15">
              Open organisation
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-sm font-semibold">{initials(name)}</span>
            <div>
              <p className="text-3xl font-semibold tracking-tight">{ready ? statusLabel(organisation?.status) : "—"}</p>
              <p className="text-xs text-white/70">Approval status</p>
            </div>
          </div>
          <div className="mt-4 border-t border-white/15 pt-3">
            <p className="text-sm leading-5 text-white/75">
              {!ready
                ? "Reading your organisation."
                : pending
                  ? "Your organisation is waiting for approval before it is public."
                  : place
                    ? `Your organisation is public in ${place}.`
                    : "Your organisation is public."}
            </p>
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Metric href="/app/opportunities" label="Opportunities" value={listed === null ? "—" : String(listed)} note={posted === 1 ? "1 posted" : posted > 1 ? `${posted} posted` : "None posted"} color="#123c38" values={monthActivities} />
          <Metric href="/app/applications" label="Applications" value={received === null ? "—" : String(received)} note={receivedNote(receivedWeeks)} color="#f26b21" values={receivedWeeks} max={Math.max(1, ...receivedWeeks)} />
        </div>
      </div>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[1.4fr_0.72fr]">
        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Applications received this month</h2>
            <p className="flex items-center gap-2 text-sm text-ink/55">
              <span className="h-2 w-2 rounded-full bg-teal" aria-hidden />
              Received
            </p>
          </div>
          <MonthChart values={receivedWeeks} marker={weekIndex} max={Math.max(1, ...receivedWeeks)} label={receivedCaption(receivedWeeks, ready)} />
          <p className="mt-2 text-sm text-ink/50">{receivedCaption(receivedWeeks, ready)}</p>
        </section>
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">{name}</h2>
          <dl className="mt-3 divide-y divide-line border-y border-line">
            <Fact label="Email" value={organisation?.email || session?.email} />
            <Fact label="City" value={organisation?.city} />
            <Fact label="Country" value={organisation?.country} />
            <Fact label="Status" value={ready ? statusLabel(organisation?.status) : null} />
          </dl>
          <Link href="/app/organisation" className="mt-3 inline-flex text-sm font-semibold text-teal underline">
            Open organisation
          </Link>
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  const shown = value?.trim();
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-xs text-ink/45">{label}</dt>
      <dd className={`text-right text-sm ${shown ? "font-semibold text-ink" : "text-ink/40"}`}>{shown || "Not added"}</dd>
    </div>
  );
}

function weeksThisMonth(dates: string[]) {
  const now = new Date();
  const weeks = [0, 0, 0, 0];
  for (const value of dates) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) continue;
    weeks[Math.min(3, Math.ceil(date.getDate() / 7) - 1)] += 1;
  }
  return weeks;
}

function receivedNote(weeks: number[]) {
  const total = weeks.reduce((sum, value) => sum + value, 0);
  if (total === 0) return "None this month";
  if (total === 1) return "1 this month";
  return `${total} this month`;
}

function receivedCaption(weeks: number[], ready: boolean) {
  if (!ready) return "Reading applications received this month.";
  const total = weeks.reduce((sum, value) => sum + value, 0);
  if (total === 0) return "No applications have been received this month.";
  if (total === 1) return "1 application was received this month.";
  return `${total} applications were received this month.`;
}

function statusLabel(status?: string | null) {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function Metric({ href, label, value, note, color, values, max = 4 }: { href: string; label: string; value: string; note: string; color: string; values: number[]; max?: number }) {
  const recorded = values.reduce((sum, item) => sum + item, 0);
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 hover:border-teal">
      <span>
        <span className="block text-xs text-ink/50">{label}</span>
        <span className="mt-1 block text-2xl font-semibold tracking-tight text-ink">{value}</span>
        <span className="block text-xs text-ink/45">{note}</span>
      </span>
      <Sparkline values={values} color={color} max={max} label={recorded === 0 ? `${label} this month, none recorded` : `${label} this month, ${recorded} recorded`} />
    </Link>
  );
}

function Sparkline({ values, color, label, max = 4 }: { values: number[]; color: string; label: string; max?: number }) {
  const width = 112;
  const height = 48;
  const scale = Math.max(max, 1);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 8 - (value / scale) * (height - 16);
    return { x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `M${points[0].x},${height} ${points.map((point) => `L${point.x},${point.y}`).join(" ")} L${points[points.length - 1].x},${height} Z`;
  const id = `spark-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-24 shrink-0" role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MonthChart({ values, marker, max = 4, label = "Applications this month, none sent in any week" }: { values: number[]; marker: number | null; max?: number; label?: string }) {
  const width = 640;
  const height = 168;
  const pad = { l: 32, r: 28, t: 8, b: 24 };
  const scale = Math.max(max, 1);
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const points = values.map((value, index) => ({
    x: pad.l + (index / (values.length - 1)) * innerW,
    y: pad.t + (1 - value / scale) * innerH,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const baseline = pad.t + innerH;
  const area = `M${points[0].x},${baseline} ${points.map((point) => `L${point.x},${point.y}`).join(" ")} L${points[points.length - 1].x},${baseline} Z`;
  const grid = scale <= 1 ? [0, 1] : [0, Math.ceil(scale / 2), scale];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-auto w-full" role="img" aria-label={label}>
      {grid.map((tick) => {
        const y = pad.t + (1 - tick / scale) * innerH;
        return (
          <g key={tick}>
            <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke="#e4d9c8" strokeWidth="1" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fill="#1c1915" fillOpacity="0.45" fontSize="11">
              {tick}
            </text>
          </g>
        );
      })}
      {marker !== null && points[marker] ? (
        <line x1={points[marker].x} x2={points[marker].x} y1={pad.t} y2={baseline} stroke="#123c38" strokeOpacity="0.35" strokeDasharray="4 4" />
      ) : null}
      <path d={area} fill="#123c38" fillOpacity="0.08" />
      <polyline points={line} fill="none" stroke="#123c38" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={index === marker ? 5 : 3.5} fill={index === marker ? "#123c38" : "#ffffff"} stroke="#123c38" strokeWidth="2" />
      ))}
      {points.map((point, index) => (
        <text key={index} x={point.x} y={height - 6} textAnchor="middle" fill="#1c1915" fillOpacity="0.45" fontSize="11">
          {`Week ${index + 1}`}
        </text>
      ))}
    </svg>
  );
}

function useWeekIndex() {
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => {
    const day = new Date().getDate();
    setIndex(Math.min(3, Math.ceil(day / 7) - 1));
  }, []);
  return index;
}
