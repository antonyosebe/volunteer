"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

type Category = { categoryId: number; name: string };

type Draft = {
  title: string;
  description: string;
  categoryId: string;
  location: string;
  isRemote: boolean;
  startsOn: string;
  endsOn: string;
  timeCommitment: string;
  volunteerCount: string;
  deadline: string;
  isPaid: boolean;
  status: string;
  organisationStatus: string;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  categoryId: "",
  location: "",
  isRemote: false,
  startsOn: "",
  endsOn: "",
  timeCommitment: "",
  volunteerCount: "",
  deadline: "",
  isPaid: false,
  status: "draft",
  organisationStatus: "pending",
};

export function OpportunityForm({ opportunityId }: { opportunityId?: string }) {
  const session = useSession();
  const router = useRouter();
  const organisation = session?.clientType === "org_admin" || session?.clientType === "org_member";
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const approved = draft.organisationStatus === "approved";

  useEffect(() => {
    let ignore = false;
    async function loadCategories() {
      try {
        const response = await fetch(`${apiUrl}/api/categories`);
        const body = (await response.json().catch(() => null)) as Category[] | null;
        if (!ignore && response.ok && Array.isArray(body)) setCategories(body);
      } catch {
        if (!ignore) setMessage("The Volunteer API is not running yet.");
      }
    }
    void loadCategories();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (opportunityId || !session?.clientId) return;
    let ignore = false;
    async function loadOrganisation() {
      try {
        const response = await fetch(`${apiUrl}/api/organisation/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as { status?: string } | null;
        if (!ignore && response.ok && body?.status) {
          setDraft((current) => ({ ...current, organisationStatus: body.status ?? "pending" }));
        }
      } catch {
        if (!ignore) setMessage("The Volunteer API is not running yet.");
      }
    }
    void loadOrganisation();
    return () => {
      ignore = true;
    };
  }, [opportunityId, session?.clientId]);

  useEffect(() => {
    if (!opportunityId || !session?.clientId) return;
    let ignore = false;
    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/opportunities/mine/${session?.clientId}/${opportunityId}`);
        const body = (await response.json().catch(() => null)) as (Partial<Draft> & { categoryId?: number | null; volunteerCount?: number | null; message?: string }) | null;
        if (ignore) return;
        if (!response.ok || !body?.title) {
          setMessage(body?.message ?? "That opportunity is not yours.");
          return;
        }
        setDraft({
          title: body.title,
          description: body.description ?? "",
          categoryId: body.categoryId ? String(body.categoryId) : "",
          location: body.location ?? "",
          isRemote: Boolean(body.isRemote),
          startsOn: body.startsOn ?? "",
          endsOn: body.endsOn ?? "",
          timeCommitment: body.timeCommitment ?? "",
          volunteerCount: body.volunteerCount ? String(body.volunteerCount) : "",
          deadline: body.deadline ?? "",
          isPaid: Boolean(body.isPaid),
          status: body.status ?? "draft",
          organisationStatus: body.organisationStatus ?? "pending",
        });
      } catch {
        if (!ignore) setMessage("The Volunteer API is not running yet.");
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [opportunityId, session?.clientId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.clientId) return;
    const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "post";
    const count = draft.volunteerCount.trim();
    const volunteerCount = count.length === 0 ? null : Number(count);
    if (count.length > 0 && (!Number.isInteger(volunteerCount) || volunteerCount! < 1)) {
      setMessage("Enter a volunteer count from 1 to 10000.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/opportunities/mine/${session.clientId}${opportunityId ? `/${opportunityId}` : ""}`, {
        method: opportunityId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          categoryId: draft.categoryId ? Number(draft.categoryId) : null,
          location: draft.location,
          isRemote: draft.isRemote,
          startsOn: draft.startsOn || null,
          endsOn: draft.endsOn || null,
          timeCommitment: draft.timeCommitment,
          volunteerCount,
          deadline: draft.deadline || null,
          isPaid: draft.isPaid,
          publish,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string; opportunityId?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Could not save the opportunity.");
        return;
      }
      router.push("/app/opportunities");
    } catch {
      setMessage("The Volunteer API is not running yet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <p className="text-sm text-ink/45">
        Workspace <span aria-hidden>›</span>{" "}
        <Link href="/app/opportunities" className="hover:text-teal">
          Opportunities
        </Link>
      </p>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{opportunityId ? "Edit opportunity" : "New opportunity"}</h1>
        <p className="mt-1 text-sm text-ink/55">
          {approved || !session
            ? "Fill in the opportunity, then save a draft or post it. Three posted opportunities is the limit."
            : "You can save a draft now. Posting waits until a staff admin approves your organisation."}
        </p>
      </header>
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
        <form onSubmit={save} className="mt-4 w-full rounded-2xl border border-line bg-white p-4 sm:w-1/2 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2">
              <input required value={draft.title} placeholder="What volunteers will do" onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={control} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea required rows={5} value={draft.description} placeholder="Where it happens, who it helps, and what a volunteer should expect." onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={`${control} resize-y leading-6`} />
            </Field>
            <Field label="Category">
              <select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })} className={control}>
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input value={draft.location} placeholder="City or place" onChange={(event) => setDraft({ ...draft, location: event.target.value })} className={control} />
            </Field>
            <Field label="Starts">
              <input type="date" value={draft.startsOn} onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })} className={control} />
            </Field>
            <Field label="Ends">
              <input type="date" value={draft.endsOn} onChange={(event) => setDraft({ ...draft, endsOn: event.target.value })} className={control} />
            </Field>
            <Field label="Time commitment">
              <input value={draft.timeCommitment} placeholder="A few hours a week" onChange={(event) => setDraft({ ...draft, timeCommitment: event.target.value })} className={control} />
            </Field>
            <Field label="Volunteers needed">
              <input inputMode="numeric" value={draft.volunteerCount} placeholder="1" onChange={(event) => setDraft({ ...draft, volunteerCount: event.target.value })} className={control} />
            </Field>
            <Field label="Application deadline">
              <input type="date" value={draft.deadline} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} className={control} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={draft.isRemote} onChange={(event) => setDraft({ ...draft, isRemote: event.target.checked })} className="h-4 w-4 accent-teal" />
              This can be done remotely
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={draft.isPaid} onChange={(event) => setDraft({ ...draft, isPaid: event.target.checked })} className="h-4 w-4 accent-teal" />
              Volunteers will be paid
            </label>
          </div>
          {message ? <p className="mt-4 text-sm font-medium text-orange">{message}</p> : null}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <Link href="/app/opportunities" className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:text-teal">
              Cancel
            </Link>
            <button type="submit" value="draft" disabled={pending} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-teal/5 disabled:opacity-60">
              {pending ? "Saving" : "Save draft"}
            </button>
            <button type="submit" value="post" disabled={pending || !approved} className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60">
              Post
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

const control = "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-teal focus:bg-white";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1.5 ${className ?? ""}`}>
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
