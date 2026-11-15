"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

export function AcceptApplication({
  clientId,
  applicationId,
  status,
  name,
  onDecided,
}: {
  clientId: string;
  applicationId: string;
  status: string;
  name?: string;
  onDecided: (status: "accepted" | "declined") => void;
}) {
  const [choice, setChoice] = useState("");
  const [confirming, setConfirming] = useState<"accepted" | "declined" | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming) return;
    cancelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) closeConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, pending]);

  if (status === "accepted" || status === "declined") return null;

  function closeConfirm() {
    setChoice("");
    setConfirming(null);
    setMessage(null);
  }

  async function decide(next: "accepted" | "declined") {
    setPending(true);
    setMessage(null);
    const action = next === "accepted" ? "accept" : "reject";
    try {
      const response = await fetch(`${apiUrl}/api/applications/${applicationId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setChoice("");
        setMessage(body?.message ?? (next === "accepted" ? "Could not accept this application." : "Could not reject this application."));
        return;
      }
      setConfirming(null);
      onDecided(next);
    } catch {
      setChoice("");
      setMessage("The Volunteer API is not running yet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex items-center gap-2 text-sm text-ink/60">
        Action
        <select
          value={choice}
          disabled={pending}
          aria-label="Action"
          onChange={(event) => {
            const value = event.target.value;
            setChoice(value);
            if (value === "accepted" || value === "declined") {
              setMessage(null);
              setConfirming(value);
            }
          }}
          className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-teal disabled:opacity-60"
        >
          <option value="">{pending ? "Saving" : "Select"}</option>
          <option value="accepted">Accept</option>
          <option value="declined">Reject</option>
        </select>
      </label>
      {message && !confirming ? <p className="text-xs text-clay">{message}</p> : null}
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" onClick={() => { if (!pending) closeConfirm(); }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="accept-application-title"
            className="w-full max-w-sm rounded-3xl border border-line bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="accept-application-title" className="text-xl font-semibold text-teal">
              {confirming === "declined" ? "Reject this application?" : "Accept this application?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              {name
                ? `${name} will be marked as ${confirming === "declined" ? "rejected" : "accepted"}.`
                : `This volunteer will be marked as ${confirming === "declined" ? "rejected" : "accepted"}.`}
            </p>
            {message ? <p className="mt-3 text-sm text-clay">{message}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                disabled={pending}
                onClick={closeConfirm}
                className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => { if (confirming) void decide(confirming); }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${confirming === "declined" ? "bg-clay hover:bg-clay/90" : "bg-teal hover:bg-teal/90"}`}
              >
                {pending
                  ? confirming === "declined" ? "Rejecting" : "Accepting"
                  : confirming === "declined" ? "Reject" : "Accept"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
