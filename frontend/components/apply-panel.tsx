"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

const labels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  declined: "Rejected",
  withdrawn: "Withdrawn",
};

export function ApplyPanel({ opportunityId, deadline, returnPath = `/opportunities/${opportunityId}` }: { opportunityId: string; deadline?: string | null; returnPath?: string }) {
  const session = useSession();
  const volunteer = session?.clientType === "volunteer";
  const closed = Boolean(deadline && deadline < today());
  const [motivation, setMotivation] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!volunteer || !session?.clientId || closed) {
      setReady(true);
      return;
    }
    let ignore = false;
    setReady(false);
    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/opportunities/${opportunityId}/applications/${session?.clientId}`);
        if (ignore) return;
        if (response.status === 404) {
          setStatus(null);
          return;
        }
        const body = (await response.json().catch(() => null)) as { status?: string; message?: string } | null;
        if (!response.ok) {
          setMessage(body?.message ?? "Could not read your application.");
          return;
        }
        setStatus(body?.status ?? "submitted");
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
  }, [closed, opportunityId, session?.clientId, volunteer]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.clientId) return;
    const note = motivation.trim();
    if (note.length < 20) {
      setMessage("Write at least a short note about why you want to help.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/opportunities/${opportunityId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: session.clientId, motivation: note }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string; status?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Could not send your application.");
        return;
      }
      setStatus(body?.status ?? "submitted");
      setMessage(body?.message ?? "Application sent.");
    } catch {
      setMessage("The Volunteer API is not running yet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      {closed ? <p className="mt-3 text-sm leading-6 text-ink/70">Applications for this opportunity have closed.</p> : null}
      {!closed && !session ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="inline-flex rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-action/90">
            Log in to apply
          </Link>
          <p className="mt-3 text-sm text-ink/60">
            New here?{" "}
            <Link href="/register" className="font-semibold text-teal">
              Create a volunteer account
            </Link>
          </p>
        </div>
      ) : null}
      {!closed && session && !volunteer ? <p className="mt-3 text-sm leading-6 text-ink/70">Only a volunteer can apply to an opportunity.</p> : null}
      {!closed && volunteer && !ready ? <p className="mt-3 text-sm text-ink/55">Checking your application.</p> : null}
      {!closed && volunteer && ready && status ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-ink/70">You have applied. The organisation can read your note.</p>
          <p className="mt-3 text-sm font-semibold text-teal">{labels[status] ?? status}</p>
          <Link href="/app/applications" className="mt-4 inline-block text-sm font-semibold text-orange">
            See your applications
          </Link>
        </div>
      ) : null}
      {!closed && volunteer && ready && !status ? (
        <form onSubmit={submit} className="mt-3">
          <p className="text-sm leading-6 text-ink/70">One application per opportunity. A short note is enough.</p>
          <label className="mt-4 grid gap-2 text-sm font-medium text-ink">
            Why you want to help
            <textarea
              value={motivation}
              onChange={(event) => setMotivation(event.target.value)}
              required
              maxLength={2000}
              rows={10}
              placeholder="Where you are, what you can offer, and why this fits."
              className="resize-y rounded-2xl border border-line bg-paper px-3 py-3 text-sm font-normal leading-6 text-ink outline-none placeholder:text-ink/35 focus:border-teal focus:bg-white"
            />
          </label>
          <p className="mt-2 text-xs text-ink/40">{motivation.trim().length} / 2000</p>
          <button type="submit" disabled={pending || motivation.trim().length < 20} className="mt-4 w-full rounded-full bg-action px-4 py-2.5 text-sm font-semibold text-white hover:bg-action/90 disabled:opacity-60">
            {pending ? "Sending" : "Send application"}
          </button>
        </form>
      ) : null}
      {message ? <p className="mt-3 text-sm font-medium text-teal">{message}</p> : null}
    </div>
  );
}

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
