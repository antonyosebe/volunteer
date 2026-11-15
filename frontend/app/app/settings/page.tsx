"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

const sections = [
  { id: "users", label: "Admin users" },
  { id: "roles", label: "Roles and permissions" },
  { id: "application", label: "Application settings" },
  { id: "categories", label: "Volunteer categories" },
  { id: "notifications", label: "Notifications" },
  { id: "audit", label: "Audit log" },
] as const;

type SectionId = (typeof sections)[number]["id"];

type StaffRow = { userId: string; email: string; fullName: string; isActive: boolean; roles: string };
type RoleRow = { privilegeId: number; code: string; name: string };
type NamedRow = { name: string };
type NoteRow = { code: string; name: string; isEnabled: boolean };
type AuditRow = { auditId: number; action: string; entityName: string; detail: string; createdAt: string };
type AppSettings = { siteName: string; supportEmail: string; tagline: string };

export default function Page() {
  const session = useSession();
  const actor = (session as { userId?: string } | null)?.userId;
  const admin = session?.clientType === "admin";
  const [section, setSection] = useState<SectionId>("users");

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span> <span className="text-ink/80">Settings</span>
      </p>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink/55">This is where you manage the application itself.</p>
      </header>
      {!session ? (
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/login" className="font-semibold text-teal underline">
            Log in
          </Link>{" "}
          as an admin to manage settings.
        </p>
      ) : null}
      {session && !admin ? <p className="mt-4 text-sm text-ink/60">Only a staff admin can manage settings.</p> : null}
      {admin ? (
        <div className="mt-3 grid items-start gap-3 md:grid-cols-[16rem_1fr]">
          <nav className="rounded-2xl border border-line bg-white p-2" aria-label="Settings">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  section === item.id ? "bg-teal/10 font-semibold text-teal" : "text-ink/70 hover:bg-teal/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <section className="rounded-2xl border border-line bg-white p-4">
            {section === "users" ? <Users actor={actor} /> : null}
            {section === "roles" ? <Roles actor={actor} /> : null}
            {section === "application" ? <Application actor={actor} /> : null}
            {section === "categories" ? <Names actor={actor} path="categories" label="category" empty="No categories yet." /> : null}
            {section === "notifications" ? <Notifications actor={actor} /> : null}
            {section === "audit" ? <Audit /> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Users({ actor }: { actor?: string }) {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const reload = useReload(setRows, "/api/admin/staff", setMessage);

  useEffect(() => {
    void reload();
    void fetch(`${apiUrl}/api/admin/roles`)
      .then((response) => response.json())
      .then((body: RoleRow[]) => Array.isArray(body) && setRoles(body))
      .catch(() => setMessage("The Volunteer API is not running yet."));
  }, [reload]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await send("/api/admin/staff", { method: "POST", body: { fullName: form.get("fullName"), email: form.get("email"), password: form.get("password"), role: form.get("role"), userId: actor } });
    setMessage(response.message);
    if (response.ok) {
      event.currentTarget.reset();
      await reload();
    }
  }

  async function toggle(row: StaffRow) {
    const response = await send(`/api/admin/staff/${row.userId}/active`, { method: "PUT", body: { isActive: !row.isActive, userId: actor } });
    setMessage(response.message);
    if (response.ok) await reload();
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">Admin users</h2>
      <form onSubmit={onSubmit} className="mt-3 grid gap-2 sm:grid-cols-2">
        <Field name="fullName" label="Name" />
        <Field name="email" label="Email" type="email" />
        <Field name="password" label="Password" type="password" />
        <label className="grid gap-1 text-xs text-ink/55">
          Role
          <select name="role" defaultValue="admin" className="rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-teal">
            {roles.map((role) => (
              <option key={role.code} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="sm:col-span-2 w-fit rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90">
          Add admin
        </button>
      </form>
      <Rows empty="No admin accounts yet.">
        {rows.map((row) => (
          <li key={row.userId} className="flex flex-wrap items-center justify-between gap-3 py-2">
            <span>
              <span className="block text-sm font-semibold text-ink">{row.fullName}</span>
              <span className="block text-xs text-ink/50">{row.email} · {row.roles || "No role"}</span>
            </span>
            <button type="button" onClick={() => toggle(row)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-teal/5">
              {row.isActive ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </Rows>
      <Note message={message} />
    </div>
  );
}

function Roles({ actor }: { actor?: string }) {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const reload = useReload(setRows, "/api/admin/roles", setMessage);
  useEffect(() => void reload(), [reload]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await send("/api/admin/roles", { method: "POST", body: { code: form.get("code"), name: form.get("name"), userId: actor } });
    setMessage(response.message);
    if (response.ok) {
      event.currentTarget.reset();
      await reload();
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">Roles and permissions</h2>
      <p className="mt-1 text-sm text-ink/55">A role is the permission a staff account can hold.</p>
      <form onSubmit={onSubmit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Field name="name" label="Name" />
        <Field name="code" label="Code" />
        <button type="submit" className="self-end rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90">
          Add role
        </button>
      </form>
      <Rows empty="No roles yet.">
        {rows.map((row) => (
          <li key={row.code} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm font-semibold text-ink">{row.name}</span>
            <span className="text-xs text-ink/50">{row.code}</span>
          </li>
        ))}
      </Rows>
      <Note message={message} />
    </div>
  );
}

function Application({ actor }: { actor?: string }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    void fetch(`${apiUrl}/api/admin/settings`)
      .then((response) => response.json())
      .then((body: AppSettings) => {
        if (!ignore && body?.siteName !== undefined) setSettings(body);
      })
      .catch(() => {
        if (!ignore) setMessage("The Volunteer API is not running yet.");
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await send("/api/admin/settings", {
      method: "PUT",
      body: { siteName: form.get("siteName"), supportEmail: form.get("supportEmail"), tagline: form.get("tagline"), userId: actor },
    });
    setMessage(response.message);
  }

  if (!settings) return <p className="text-sm text-ink/55">{message ?? "Reading settings."}</p>;

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <h2 className="text-sm font-semibold text-ink">Application settings</h2>
      <Field name="siteName" label="Site name" defaultValue={settings.siteName} />
      <Field name="supportEmail" label="Support email" type="email" defaultValue={settings.supportEmail} />
      <Field name="tagline" label="Tagline" defaultValue={settings.tagline} />
      <button type="submit" className="w-fit rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90">
        Save settings
      </button>
      <Note message={message} />
    </form>
  );
}

function Names({ actor, path, label, empty }: { actor?: string; path: string; label: string; empty: string }) {
  const [rows, setRows] = useState<NamedRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const reload = useReload(setRows, `/api/admin/${path}`, setMessage);
  useEffect(() => void reload(), [reload]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await send(`/api/admin/${path}`, { method: "POST", body: { name: form.get("name"), userId: actor } });
    setMessage(response.message);
    if (response.ok) {
      event.currentTarget.reset();
      await reload();
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">Volunteer categories</h2>
      <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-2">
        <Field name="name" label={`New ${label}`} />
        <button type="submit" className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90">
          Add
        </button>
      </form>
      <Rows empty={empty}>
        {rows.map((row) => (
          <li key={row.name} className="py-2 text-sm font-semibold text-ink">
            {row.name}
          </li>
        ))}
      </Rows>
      <Note message={message} />
    </div>
  );
}

function Notifications({ actor }: { actor?: string }) {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const reload = useReload(setRows, "/api/admin/notifications", setMessage);
  useEffect(() => void reload(), [reload]);

  async function toggle(row: NoteRow) {
    const response = await send(`/api/admin/notifications/${row.code}`, { method: "PUT", body: { isActive: !row.isEnabled, userId: actor } });
    setMessage(response.message);
    if (response.ok) await reload();
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">Notification settings</h2>
      <p className="mt-1 text-sm text-ink/55">These apply across the whole application.</p>
      <Rows empty="No notifications are configured.">
        {rows.map((row) => (
          <li key={row.code} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm font-semibold text-ink">{row.name}</span>
            <button type="button" onClick={() => toggle(row)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-teal/5">
              {row.isEnabled ? "On" : "Off"}
            </button>
          </li>
        ))}
      </Rows>
      <Note message={message} />
    </div>
  );
}

function Audit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const reload = useReload(setRows, "/api/admin/audit", setMessage);
  useEffect(() => void reload(), [reload]);

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">Audit log</h2>
      <Rows empty="No staff actions have been recorded yet.">
        {rows.map((row) => (
          <li key={row.auditId} className="flex flex-wrap items-baseline justify-between gap-3 py-2">
            <span>
              <span className="block text-sm font-semibold text-ink">{row.action} {row.entityName}</span>
              <span className="block text-xs text-ink/50">{row.detail}</span>
            </span>
            <time className="text-xs text-ink/45" dateTime={row.createdAt}>
              {new Date(row.createdAt).toLocaleString()}
            </time>
          </li>
        ))}
      </Rows>
      <Note message={message} />
    </div>
  );
}

function Field({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-xs text-ink/55">
      {label}
      <input name={name} type={type} required minLength={type === "password" ? 8 : undefined} defaultValue={defaultValue} className="rounded-lg border border-line px-3 py-2 text-sm text-ink outline-none focus:border-teal" />
    </label>
  );
}

function Rows({ empty, children }: { empty: string; children: ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  if (list.length === 0) return <p className="mt-3 text-sm text-ink/55">{empty}</p>;
  return <ul className="mt-3 divide-y divide-line border-y border-line">{list}</ul>;
}

function Note({ message }: { message: string | null }) {
  return message ? <p className="mt-3 text-sm font-medium text-teal">{message}</p> : null;
}

function useReload<T>(setRows: (rows: T[]) => void, path: string, setMessage: (message: string | null) => void) {
  return useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}${path}`);
      const body = (await response.json().catch(() => null)) as T[] | null;
      if (!response.ok || !Array.isArray(body)) {
        setMessage("Could not read this list.");
        return;
      }
      setRows(body);
    } catch {
      setMessage("The Volunteer API is not running yet.");
    }
  }, [path, setMessage, setRows]);
}

async function send(path: string, options: { method: string; body: unknown }) {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method: options.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options.body),
    });
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: response.ok, message: body?.message ?? (response.ok ? "Saved." : "Could not save that.") };
  } catch {
    return { ok: false, message: "The Volunteer API is not running yet." };
  }
}
