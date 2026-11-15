"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AcceptApplication } from "@/components/accept-application";
import { apiUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

type Applicant = {
  applicationId: string;
  opportunityId: string;
  title: string;
  fullName: string;
  email: string;
  motivation: string;
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

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-5 text-sm text-ink/60">Reading applicants.</p>}>
      <Applicants />
    </Suspense>
  );
}

function Applicants() {
  const params = useParams<{ id: string }>();
  const session = useSession();
  const organisation = session?.clientType === "org_admin" || session?.clientType === "org_member";
  const [title, setTitle] = useState<string | null>(null);
  const [rows, setRows] = useState<Applicant[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!organisation || !session?.clientId || !params.id) return;
    let ignore = false;
    async function load() {
      try {
        const listing = await fetch(`${apiUrl}/api/opportunities/mine/${session?.clientId}/${params.id}`);
        const owned = (await listing.json().catch(() => null)) as { title?: string; message?: string } | null;
        if (ignore) return;
        if (!listing.ok || !owned?.title) {
          setMessage(owned?.message ?? "That opportunity is not yours.");
          setReady(true);
          return;
        }
        setTitle(owned.title);
        const response = await fetch(`${apiUrl}/api/applications/received/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as Applicant[] | { message?: string } | null;
        if (ignore) return;
        if (!response.ok || !Array.isArray(body)) {
          setMessage((body as { message?: string } | null)?.message ?? "Could not read applicants.");
          return;
        }
        setRows(body.filter((row) => row.opportunityId === params.id));
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
  }, [organisation, params.id, session?.clientId]);

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span>{" "}
        <Link href="/app/opportunities" className="hover:text-ink">
          Opportunities
        </Link>{" "}
        <span aria-hidden>›</span> <span className="text-ink/80">Applicants</span>
      </p>
      {!session ? (
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/login" className="font-semibold text-teal underline">
            Log in
          </Link>{" "}
          to see applicants.
        </p>
      ) : null}
      {session && !organisation ? <p className="mt-4 text-sm text-ink/60">Only an organisation can see applicants.</p> : null}
      {organisation ? (
        <header className="mt-4">
          <h1 className="text-3xl font-semibold tracking-tight text-teal">Applicants</h1>
          <p className="mt-1 text-sm text-ink/55">{title ?? (ready ? "This opportunity" : "Reading applicants.")}</p>
        </header>
      ) : null}
      {message ? <p className="mt-4 text-sm font-medium text-teal">{message}</p> : null}
      {organisation && ready && !message && rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">No one has applied to this opportunity yet.</p>
      ) : null}
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
              <p className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm leading-6 text-ink/80">{row.motivation}</p>
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
