"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AcceptApplication } from "@/components/accept-application";
import { apiUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

type Row = {
  applicationId: string;
  opportunityId: string;
  title: string;
  organisationName: string;
  status: string;
  submittedAt: string;
};

const labels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  declined: "Rejected",
  withdrawn: "Withdrawn",
};

type Received = {
  applicationId: string;
  opportunityId: string;
  title: string;
  fullName: string;
  email: string;
  motivation: string;
  status: string;
  submittedAt: string;
};

export default function Page() {
  const session = useSession();
  const organisation = session?.clientType === "org_admin" || session?.clientType === "org_member";
  if (organisation) return <ReceivedApplications />;
  return <VolunteerApplications />;
}

function VolunteerApplications() {
  const session = useSession();
  const volunteer = session?.clientType === "volunteer";
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!volunteer || !session?.clientId) return;
    let ignore = false;
    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/applications/mine/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as Row[] | { message?: string } | null;
        if (ignore) return;
        if (!response.ok || !Array.isArray(body)) {
          setMessage((body as { message?: string } | null)?.message ?? "Could not read your applications.");
          return;
        }
        setRows(body);
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
  }, [session?.clientId, volunteer]);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Applications</span>
      </p>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Applications</h1>
        <p className="mt-1 text-sm text-ink/55">Each opportunity keeps one application.</p>
      </header>
      {!session ? (
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/login" className="font-semibold text-teal underline">
            Log in
          </Link>{" "}
          to see your applications.
        </p>
      ) : null}
      {session && !volunteer ? <p className="mt-4 text-sm text-ink/60">Only a volunteer has applications.</p> : null}
      {message ? <p className="mt-4 text-sm font-medium text-teal">{message}</p> : null}
      {volunteer && ready && rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink/60">
          No applications yet.{" "}
          <Link href="/app/discover" className="font-semibold text-teal underline">
            Find an opportunity
          </Link>
        </p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <li key={row.applicationId}>
              <Link href={`/app/discover/${row.opportunityId}`} className="block rounded-2xl border border-line bg-white p-4 hover:border-teal">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">{row.title}</h2>
                    <p className="mt-1 text-sm text-ink/55">{row.organisationName}</p>
                  </div>
                  <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">{labels[row.status] ?? row.status}</span>
                </div>
                <p className="mt-3 text-xs text-ink/40">Sent {showDate(row.submittedAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ReceivedApplications() {
  const session = useSession();
  const [rows, setRows] = useState<Received[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.clientId) return;
    let ignore = false;
    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/applications/received/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as Received[] | { message?: string } | null;
        if (ignore) return;
        if (!response.ok || !Array.isArray(body)) {
          setMessage((body as { message?: string } | null)?.message ?? "Could not read applicants.");
          return;
        }
        setRows(body);
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
  }, [session?.clientId]);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Applications</span>
      </p>
      <header className="mt-3">
        <h1 className="text-3xl font-semibold tracking-tight text-teal">Applications</h1>
        <p className="mt-1 text-sm text-ink/55">Requests volunteers have sent to your opportunities.</p>
      </header>
      {message ? <p className="mt-4 text-sm font-medium text-teal">{message}</p> : null}
      {ready && !message && rows.length === 0 ? <p className="mt-6 text-sm text-ink/60">No one has applied yet.</p> : null}
      {rows.length > 0 ? (
        <ul className="mt-6 grid gap-4">
          {rows.map((row) => (
            <li key={row.applicationId} className="rounded-3xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-ink">{row.fullName}</h2>
                  <p className="mt-1 text-sm text-ink/55">{row.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {session?.clientId ? (
                    <AcceptApplication
                      clientId={session.clientId}
                      applicationId={row.applicationId}
                      status={row.status}
                      name={row.fullName}
                      onDecided={(status) =>
                        setRows((current) => current.map((item) => (item.applicationId === row.applicationId ? { ...item, status } : item)))
                      }
                    />
                  ) : null}
                  <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">{labels[row.status] ?? row.status}</span>
                </div>
              </div>
              <Link href={`/app/opportunities/${row.opportunityId}/applicants`} className="mt-3 inline-block text-sm font-semibold text-orange">
                {row.title}
              </Link>
              <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm leading-6 text-ink/80">{row.motivation}</p>
              <p className="mt-3 text-xs text-ink/40">Sent {showDate(row.submittedAt)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function showDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
