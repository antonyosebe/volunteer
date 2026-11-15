"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { initials, useSession, writeSession } from "@/lib/session";

type Organisation = {
  name: string;
  email: string;
  country: string | null;
  city: string | null;
  status: string;
  memberRole: string;
};

export default function Page() {
  const session = useSession();
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [draft, setDraft] = useState({ name: "", city: "", country: "" });
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const openedAt = useRef(0);
  const name = editing ? draft.name || "Your organisation" : organisation?.name || session?.fullName || "Your organisation";
  const approved = organisation?.status === "approved";
  const canEdit = organisation?.memberRole === "org_admin";

  useEffect(() => {
    if (!session?.clientId) return;
    let ignore = false;
    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/organisation/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as (Organisation & { message?: string }) | null;
        if (ignore) return;
        if (!response.ok || !body?.name) {
          setMessage(body?.message ?? "Your organisation is not on file yet.");
          return;
        }
        setOrganisation(body);
        setDraft({ name: body.name, city: body.city ?? "", country: body.country ?? "" });
      } catch {
        if (!ignore) setMessage("The Volunteer API is not running yet.");
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [session?.clientId]);

  function startEdit() {
    openedAt.current = Date.now();
    setDraft({
      name: organisation?.name || session?.fullName || "",
      city: organisation?.city ?? "",
      country: organisation?.country ?? "",
    });
    setMessage(null);
    setEditing(true);
  }

  function stopEdit() {
    setEditing(false);
    setMessage(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Date.now() - openedAt.current < 600) return;
    if (!session?.clientId) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/organisation/${session.clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, city: draft.city, country: draft.country }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Could not save the profile.");
        return;
      }
      const saved = {
        name: draft.name.trim(),
        city: draft.city.trim() || null,
        country: draft.country.trim() || null,
      };
      setOrganisation((current) => (current ? { ...current, ...saved } : current));
      writeSession({ fullName: saved.name });
      setEditing(false);
      setMessage("Profile saved.");
    } catch {
      setMessage("The Volunteer API is not running yet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/45">
          Workspace <span aria-hidden>›</span> <span className="text-ink/80">Profile</span>
        </p>
        {canEdit && !editing ? (
          <button type="button" onClick={startEdit} className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90">
            Edit profile
          </button>
        ) : null}
      </div>
      <form id="organisation-profile" onSubmit={save} className="mt-3 rounded-2xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-teal/10 text-lg font-semibold text-teal">{initials(name)}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{name}</h1>
            <p className="mt-1 text-sm text-ink/60">{organisation?.email || session?.email || "Sign in to see your organisation"}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-line p-4">
            <h2 className="text-sm font-semibold text-ink">Organisation</h2>
            <dl className="mt-3 grid gap-4">
              <ProfileField label="Name" editing={editing} value={draft.name} shown={organisation?.name} onChange={(value) => setDraft({ ...draft, name: value })} />
              <Field label="Email" value={organisation?.email || session?.email} />
              <ProfileField label="City" editing={editing} value={draft.city} shown={organisation?.city} onChange={(value) => setDraft({ ...draft, city: value })} />
              <ProfileField label="Country" editing={editing} value={draft.country} shown={organisation?.country} onChange={(value) => setDraft({ ...draft, country: value })} />
            </dl>
          </section>
          <section className="rounded-xl border border-line p-4">
            <h2 className="text-sm font-semibold text-ink">Account</h2>
            <dl className="mt-3 grid gap-4">
              <Field label="Role" value={organisation ? (organisation.memberRole === "org_admin" ? "Admin" : "Member") : session ? "Admin" : undefined} />
              <Field label="Status" value={organisation ? statusLabel(organisation.status) : undefined} />
            </dl>
            <p className="mt-4 text-sm leading-6 text-ink/60">
              {organisation
                ? approved
                  ? "Your organisation is approved and can be shown publicly."
                  : "Your organisation stays pending until a staff admin approves it."
                : "Sign in to see your organisation."}
            </p>
          </section>
        </div>
        {editing ? (
          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60">
              {pending ? "Saving" : "Save"}
            </button>
            <button type="button" onClick={stopEdit} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-teal/5">
              Cancel
            </button>
          </div>
        ) : null}
        {message ? <p className="mt-4 text-sm font-medium text-teal">{message}</p> : null}
        {session ? null : (
          <p className="mt-4 text-sm text-ink/60">
            <Link href="/login" className="font-semibold text-teal underline">
              Log in
            </Link>{" "}
            to see your organisation.
          </p>
        )}
      </form>
    </div>
  );
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function ProfileField({ label, editing, value, shown, onChange }: { label: string; editing: boolean; value: string; shown?: string | null; onChange: (value: string) => void }) {
  if (!editing) return <Field label={label} value={shown} />;
  return (
    <div>
      <label className="grid gap-1 text-xs text-ink/45">
        {label}
        <input
          value={value}
          required={label === "Name"}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label === "Name" ? "Organisation name" : label}
          className="rounded-lg border border-line bg-[#f3f4f6] px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-teal"
        />
      </label>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const shown = value?.trim();
  return (
    <div>
      <dt className="text-xs text-ink/45">{label}</dt>
      <dd className={`mt-1 text-sm ${shown ? "font-semibold text-ink" : "text-ink/40"}`}>{shown || "Not added"}</dd>
    </div>
  );
}
