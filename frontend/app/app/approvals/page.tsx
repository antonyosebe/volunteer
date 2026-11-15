"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

type OrganisationRow = {
  organisationId: string;
  name: string;
  email: string;
  status: string;
};

export default function Page() {
  const session = useSession();
  const [rows, setRows] = useState<OrganisationRow[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const admin = session?.clientType === "admin";
  const shown = rows.filter((row) => filter === "all" || row.status === filter);

  useEffect(() => {
    if (!admin) return;
    let ignore = false;
    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/admin/organisations`);
        const body = (await response.json().catch(() => null)) as OrganisationRow[] | null;
        if (ignore) return;
        if (!response.ok || !Array.isArray(body)) {
          setMessage("Could not read organisations.");
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
  }, [admin]);

  async function updateStatus(organisationId: string, status: "approved" | "rejected" | "suspended") {
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/admin/organisations/${organisationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Could not update that organisation.");
        return;
      }
      setRows((current) => current.map((row) => (row.organisationId === organisationId ? { ...row, status } : row)));
      setMessage(status === "approved" ? "Organisation approved." : status === "rejected" ? "Organisation rejected." : "Organisation suspended.");
    } catch {
      setMessage("The Volunteer API is not running yet.");
    }
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Approvals</span>
      </p>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Approvals</h1>
        <p className="mt-1 text-sm text-ink/55">Approve an organisation before it can be shown publicly.</p>
      </header>
      {!session ? (
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/login" className="font-semibold text-teal underline">
            Log in
          </Link>{" "}
          as an admin to review organisations.
        </p>
      ) : null}
      {session && !admin ? <p className="mt-4 text-sm text-ink/60">Only a staff admin can approve organisations.</p> : null}
      {admin ? (
        <section className="mt-3 rounded-2xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Organisations</h2>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              Status
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-teal"
              >
                <option value="all">All</option>
                <option value="pending">Waiting</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </div>
          {!ready ? <p className="mt-3 text-sm text-ink/55">Reading organisations.</p> : null}
          {ready && shown.length === 0 ? <p className="mt-3 text-sm text-ink/55">No organisations match this filter.</p> : null}
          {shown.length > 0 ? (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {shown.map((row) => (
                <li key={row.organisationId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <OrganisationName row={row} />
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-medium text-ink/50">{statusLabel(row.status)}</span>
                    {row.status === "pending" ? (
                      <button type="button" onClick={() => updateStatus(row.organisationId, "rejected")} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-teal/5">
                        Reject
                      </button>
                    ) : null}
                    {row.status === "approved" ? (
                      <button type="button" onClick={() => updateStatus(row.organisationId, "suspended")} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-teal/5">
                        Suspend
                      </button>
                    ) : (
                      <button type="button" onClick={() => updateStatus(row.organisationId, "approved")} className="rounded-lg bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal/90">
                        Approve
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {message ? <p className="mt-3 text-sm font-medium text-teal">{message}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function OrganisationName({ row }: { row: OrganisationRow }) {
  return (
    <span>
      <span className="block text-sm font-semibold text-ink">{row.name}</span>
      <span className="block text-xs text-ink/50">{row.email}</span>
    </span>
  );
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
