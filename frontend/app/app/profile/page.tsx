"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { initials, roleLabel, useSession, writeSession } from "@/lib/session";

const tabs = ["Personal", "Skills", "Availability"] as const;

type Profile = {
  fullName: string;
  email: string;
  phone: string | null;
  age: number | null;
  workplace: string | null;
  country: string | null;
  city: string | null;
  availability: string | null;
  clientType: string;
  isActive: boolean;
  photoPath: string | null;
  isPrivate?: boolean;
};

type Draft = {
  fullName: string;
  phone: string;
  age: string;
  city: string;
  country: string;
  workplace: string;
  availability: string;
  isPrivate: boolean;
};

const emptyDraft: Draft = {
  fullName: "",
  phone: "",
  age: "",
  city: "",
  country: "",
  workplace: "",
  availability: "",
  isPrivate: false,
};

export default function Page() {
  const session = useSession();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Personal");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [choices, setChoices] = useState<ChoiceLists>({ skills: [], hobbies: [], focusAreas: [] });
  const [skillDraft, setSkillDraft] = useState<string[]>([]);
  const [hobbyDraft, setHobbyDraft] = useState<string[]>([]);
  const [focusDraft, setFocusDraft] = useState<string[]>([]);
  const openedAt = useRef(0);
  const name = profile?.fullName || session?.fullName?.trim() || "Your profile";
  const email = profile?.email || session?.email;
  const canEditPhoto = (profile?.clientType || session?.clientType) === "volunteer";
  const shownPhoto = photoPreview || (removePhoto ? null : photoAddress(profile?.photoPath, photoVersion));

  useEffect(() => {
    if (!session?.clientId) return;
    let ignore = false;
    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/profile/${session?.clientId}`);
        const body = (await response.json().catch(() => null)) as (Profile & { message?: string }) | null;
        if (!response.ok || !body || ignore) return;
        setProfile(body);
        if (body.clientType === "volunteer") {
          const choicesResponse = await fetch(`${apiUrl}/api/profile/${session?.clientId}/choices`);
          const choiceBody = (await choicesResponse.json().catch(() => null)) as ChoiceLists | null;
          if (!ignore && choicesResponse.ok && choiceBody?.skills) {
            setChoices(choiceBody);
            setSkillDraft(chosen(choiceBody.skills));
            setHobbyDraft(chosen(choiceBody.hobbies));
            setFocusDraft(chosen(choiceBody.focusAreas));
          }
        }
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
    setDraft({
      fullName: profile?.fullName || session?.fullName || "",
      phone: profile?.phone || "",
      age: profile?.age ? String(profile.age) : "",
      city: profile?.city || "",
      country: profile?.country || "",
      workplace: profile?.workplace || "",
      availability: profile?.availability || "",
      isPrivate: Boolean(profile?.isPrivate),
    });
    setMessage(null);
    setPhotoFile(null);
    setRemovePhoto(false);
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setSkillDraft(chosen(choices.skills));
    setHobbyDraft(chosen(choices.hobbies));
    setFocusDraft(chosen(choices.focusAreas));
    openedAt.current = Date.now();
    setEditing(true);
  }

  function stopEdit() {
    setPhotoFile(null);
    setRemovePhoto(false);
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setEditing(false);
    setMessage(null);
  }

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
    if (!allowed) {
      setMessage("Choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("That image is larger than 2 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
    setPhotoFile(file);
    setRemovePhoto(false);
    setMessage(null);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setRemovePhoto(true);
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.clientId || Date.now() - openedAt.current < 600) return;
    const ageText = draft.age.trim();
    const age = ageText.length === 0 ? null : Number(ageText);
    if (ageText.length > 0 && (!Number.isInteger(age) || age! < 1 || age! > 120)) {
      setMessage("Enter an age from 1 to 120.");
      return;
    }
    if (draft.fullName.trim().length === 0) {
      setMessage("Enter your full name.");
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      if (photoFile || (removePhoto && profile?.photoPath)) {
        const photoResponse = photoFile
          ? await fetch(`${apiUrl}/api/profile/${session.clientId}/photo`, {
              method: "PUT",
              body: fileBody(photoFile),
            })
          : await fetch(`${apiUrl}/api/profile/${session.clientId}/photo`, { method: "DELETE" });
        const photoBody = (await photoResponse.json().catch(() => null)) as { message?: string } | null;
        if (!photoResponse.ok) {
          setMessage(photoBody?.message ?? "Could not save your photo.");
          return;
        }
      }

      const response = await fetch(`${apiUrl}/api/profile/${session.clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: draft.fullName,
          phone: draft.phone,
          age,
          workplace: draft.workplace,
          country: draft.country,
          city: draft.city,
          availability: draft.availability,
          isPrivate: draft.isPrivate,
        }),
      });
      const body = (await response.json().catch(() => null)) as (Profile & { message?: string }) | null;
      if (!response.ok || !body?.fullName) {
        setMessage(body?.message ?? "Could not save your profile.");
        return;
      }
      setProfile(body);
      writeSession({ fullName: body.fullName });
      setPhotoVersion(Date.now());
      setPhotoFile(null);
      setRemovePhoto(false);
      setPhotoPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      if ((body.clientType || session.clientType) === "volunteer") {
        const choiceResponse = await fetch(`${apiUrl}/api/profile/${session.clientId}/choices`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: skillDraft, hobbies: hobbyDraft, focusAreas: focusDraft }),
        });
        const choiceBody = (await choiceResponse.json().catch(() => null)) as (ChoiceLists & { message?: string }) | null;
        if (!choiceResponse.ok || !choiceBody?.skills) {
          setMessage(choiceBody?.message ?? "Could not save your skills.");
          return;
        }
        setChoices(choiceBody);
        setSkillDraft(chosen(choiceBody.skills));
        setHobbyDraft(chosen(choiceBody.hobbies));
        setFocusDraft(chosen(choiceBody.focusAreas));
      }
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
        {editing ? null : (
          <button
            type="button"
            onClick={startEdit}
            disabled={!session?.clientId}
            className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60"
          >
            Edit profile
          </button>
        )}
      </div>

      <form id="profile-form" onSubmit={save} className="mt-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          {shownPhoto ? (
            <img src={shownPhoto} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-teal/10 text-xl font-semibold text-teal">
              {initials(name)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{editing ? draft.fullName || "Your profile" : name}</h1>
            <p className="mt-1 text-sm text-ink/60">{email || "Sign in to see your account"}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-6 border-b border-line" role="tablist" aria-label="Profile sections">
          {tabs.map((item) => {
            const selected = tab === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item)}
                className={`-mb-px border-b-2 pb-3 text-sm ${
                  selected ? "border-teal font-semibold text-teal" : "border-transparent text-ink/55 hover:text-ink"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {tab === "Personal" ? (
            <>
              <Card title="Personal information">
                <ProfileField label="Full name" editing={editing} value={draft.fullName} shown={profile?.fullName || session?.fullName} onChange={(value) => setDraft({ ...draft, fullName: value })} />
                <Field label="Email" value={email} />
                <ProfileField label="Phone" editing={editing} value={draft.phone} shown={profile?.phone} onChange={(value) => setDraft({ ...draft, phone: value })} />
                <ProfileField label="Age" editing={editing} value={draft.age} shown={profile?.age ? String(profile.age) : undefined} inputMode="numeric" onChange={(value) => setDraft({ ...draft, age: value })} />
                <ProfileField label="City" editing={editing} value={draft.city} shown={profile?.city} onChange={(value) => setDraft({ ...draft, city: value })} />
                <ProfileField label="Country" editing={editing} value={draft.country} shown={profile?.country} onChange={(value) => setDraft({ ...draft, country: value })} />
              </Card>
              <Card title="Account">
                <Field label="Role" value={session ? roleLabel(profile?.clientType || session.clientType) : undefined} />
                <Field label="Status" value={session ? (profile?.isActive === false ? "Not active" : "Active") : undefined} />
                <PrivateProfile editing={editing} value={editing ? draft.isPrivate : Boolean(profile?.isPrivate)} onChange={(value) => setDraft({ ...draft, isPrivate: value })} />
                <PhotoField editing={editing && canEditPhoto} shown={shownPhoto} onPick={pickPhoto} onRemove={clearPhoto} />
              </Card>
            </>
          ) : null}
          {tab === "Skills" ? (
            <>
              <ChoiceList title="Skills" editing={editing} catalogue={choices.skills.map((item) => item.name)} selected={editing ? skillDraft : chosen(choices.skills)} onChange={setSkillDraft} addLabel="Add a skill" />
              <ChoiceList title="Hobbies" editing={editing} catalogue={choices.hobbies.map((item) => item.name)} selected={editing ? hobbyDraft : chosen(choices.hobbies)} onChange={setHobbyDraft} addLabel="Add a hobby" />
              <ChoiceList title="Focus areas" editing={editing} catalogue={choices.focusAreas.map((item) => item.name)} selected={editing ? focusDraft : chosen(choices.focusAreas)} onChange={setFocusDraft} addLabel="Add a focus area" />
            </>
          ) : null}
          {tab === "Availability" ? (
            <>
              <Card title="Where you can help">
                <ProfileField label="City" editing={editing} value={draft.city} shown={profile?.city} onChange={(value) => setDraft({ ...draft, city: value })} />
                <ProfileField label="Country" editing={editing} value={draft.country} shown={profile?.country} onChange={(value) => setDraft({ ...draft, country: value })} />
                <ProfileField label="Workplace" editing={editing} value={draft.workplace} shown={profile?.workplace} onChange={(value) => setDraft({ ...draft, workplace: value })} />
              </Card>
              <Card title="When you can help">
                <AvailabilityDays editing={editing} value={draft.availability} shown={profile?.availability} onChange={(value) => setDraft({ ...draft, availability: value })} />
              </Card>
            </>
          ) : null}
        </div>
        {editing ? (
          <div className="mt-5 flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60"
            >
              {pending ? "Saving" : "Save"}
            </button>
            <button type="button" onClick={stopEdit} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-teal/5">
              Cancel
            </button>
          </div>
        ) : null}
        {message ? <p className="mt-4 text-sm font-medium text-teal" role="status">{message}</p> : null}
      </form>
      {session ? null : (
        <p className="mt-4 text-sm text-ink/60">
          <Link href="/login" className="font-semibold text-teal underline">
            Log in
          </Link>{" "}
          to see your profile.
        </p>
      )}
    </div>
  );
}

type Choice = { id: number; name: string; selected: boolean };
type ChoiceLists = { skills: Choice[]; hobbies: Choice[]; focusAreas: Choice[] };

function chosen(rows: Choice[] | undefined) {
  return (rows ?? []).filter((item) => item.selected).map((item) => item.name);
}

function ChoiceList({
  title,
  editing,
  catalogue,
  selected,
  onChange,
  addLabel,
}: {
  title: string;
  editing: boolean;
  catalogue: string[];
  selected: string[];
  onChange: (names: string[]) => void;
  addLabel: string;
}) {
  const [text, setText] = useState("");
  const names = [...new Set([...catalogue, ...selected])];

  function toggle(name: string) {
    onChange(selected.some((item) => item.toLowerCase() === name.toLowerCase()) ? selected.filter((item) => item.toLowerCase() !== name.toLowerCase()) : [...selected, name]);
  }

  function add() {
    const name = text.trim();
    if (name.length === 0) return;
    if (!selected.some((item) => item.toLowerCase() === name.toLowerCase())) {
      const existing = names.find((item) => item.toLowerCase() === name.toLowerCase());
      onChange([...selected, existing ?? name]);
    }
    setText("");
  }

  return (
    <Card title={title}>
      {editing ? (
        <>
          <div className="flex flex-wrap gap-2">
            {names.map((name) => {
              const on = selected.some((item) => item.toLowerCase() === name.toLowerCase());
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(name)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${on ? "bg-teal text-white" : "border border-line text-ink"}`}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder={addLabel}
              maxLength={80}
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-teal"
            />
            <button type="button" onClick={add} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-teal/5">
              Add
            </button>
          </div>
        </>
      ) : selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((name) => (
            <span key={name} className="rounded-full bg-teal/10 px-3 py-1.5 text-sm font-medium text-teal">
              {name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink/40">Not added</p>
      )}
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

const maxAvailability = 200;

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function dayIso(year: number, month: number, day: number) {
  return `${monthKey(year, month)}-${String(day).padStart(2, "0")}`;
}

function isRealDay(year: number, month: number, day: number) {
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}

function monthDates(key: string) {
  const [year, monthNumber] = key.split("-").map(Number);
  const month = monthNumber - 1;
  if (!year || month < 0 || month > 11) return null;
  return Array.from({ length: daysInMonth(year, month) }, (_, index) => dayIso(year, month, index + 1));
}

function parseDays(value: string | null | undefined) {
  const parts = (value ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return [];
  const days: string[] = [];
  for (const part of parts) {
    const month = part.match(/^(\d{4})-(\d{2})$/);
    if (month) {
      const dates = monthDates(part);
      if (!dates) return null;
      days.push(...dates);
      continue;
    }
    const except = part.match(/^(\d{4}-\d{2})!(\d{2}(?:,\d{2})*)$/);
    if (except) {
      const dates = monthDates(except[1]);
      const skipped = new Set(except[2].split(","));
      if (!dates || [...skipped].some((day) => !dates.includes(`${except[1]}-${day}`))) return null;
      days.push(...dates.filter((iso) => !skipped.has(iso.slice(-2))));
      continue;
    }
    const single = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!single || !isRealDay(Number(single[1]), Number(single[2]) - 1, Number(single[3]))) return null;
    days.push(part);
  }
  return [...new Set(days)].sort();
}

function serializeDays(days: string[]) {
  const grouped = new Map<string, string[]>();
  for (const iso of [...new Set(days)].sort()) {
    const key = iso.slice(0, 7);
    grouped.set(key, [...(grouped.get(key) ?? []), iso]);
  }
  const tokens: string[] = [];
  for (const [key, selected] of grouped) {
    const all = monthDates(key);
    if (!all) continue;
    const full = `${key}`;
    const missing = all.filter((iso) => !selected.includes(iso));
    const exceptions = missing.length === 0 ? full : `${key}!${missing.map((iso) => iso.slice(-2)).join(",")}`;
    const listed = selected.join(",");
    tokens.push(exceptions.length < listed.length ? exceptions : listed);
  }
  return tokens.join(",");
}

function formatDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function selectionChips(days: string[]) {
  const grouped = new Map<string, string[]>();
  for (const iso of days) grouped.set(iso.slice(0, 7), [...(grouped.get(iso.slice(0, 7)) ?? []), iso]);
  const chips: { id: string; label: string; month?: string; iso?: string }[] = [];
  for (const [key, selected] of grouped) {
    const all = monthDates(key);
    if (all && selected.length === all.length) {
      chips.push({ id: key, label: formatMonth(key), month: key });
      continue;
    }
    for (const iso of selected) chips.push({ id: iso, label: formatDay(iso), iso });
  }
  return chips;
}

function AvailabilityDays({
  editing,
  value,
  shown,
  onChange,
}: {
  editing: boolean;
  value: string;
  shown?: string | null;
  onChange: (value: string) => void;
}) {
  const today = new Date();
  const stored = parseDays(shown);
  const picked = parseDays(value);
  const [cursor, setCursor] = useState(() => {
    const first = picked?.[0];
    if (first) {
      const [year, month] = first.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [limit, setLimit] = useState(false);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = daysInMonth(year, month);
  const todayIso = dayIso(today.getFullYear(), today.getMonth(), today.getDate());
  const visible = Array.from({ length: count }, (_, index) => dayIso(year, month, index + 1));
  const whole = visible.every((iso) => (picked ?? []).includes(iso));

  function commit(days: string[]) {
    const next = serializeDays(days);
    if (next.length > maxAvailability) {
      setLimit(true);
      return;
    }
    setLimit(false);
    onChange(next);
  }

  if (!editing) {
    if (stored === null) return <Field label="Availability" value={shown} />;
    if (stored.length === 0) return <Field label="Availability" value={null} />;
    return (
      <div>
        <p className="text-xs text-ink/45">Availability</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selectionChips(stored).map((chip) => (
            <span key={chip.id} className="rounded-full bg-teal/10 px-3 py-1.5 text-sm font-medium text-teal">
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  function toggle(iso: string) {
    const current = picked ?? [];
    commit(current.includes(iso) ? current.filter((day) => day !== iso) : [...current, iso]);
  }

  function toggleMonth(key = monthKey(year, month)) {
    const dates = monthDates(key) ?? [];
    const current = new Set(picked ?? []);
    const allOn = dates.every((iso) => current.has(iso));
    if (allOn) dates.forEach((iso) => current.delete(iso));
    else dates.forEach((iso) => current.add(iso));
    commit([...current]);
  }

  return (
    <div>
      <p className="text-xs text-ink/45">Availability</p>
      {stored === null && shown?.trim() ? <p className="mt-1 text-sm text-ink/70">{shown}</p> : null}
      <div className="mt-2 rounded-lg border border-line p-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-md px-2 py-1 text-sm text-ink hover:bg-teal/5" aria-label="Previous month">
            ‹
          </button>
          <p className="text-sm font-semibold text-ink">{formatMonth(monthKey(year, month))}</p>
          <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-md px-2 py-1 text-sm text-ink hover:bg-teal/5" aria-label="Next month">
            ›
          </button>
        </div>
        <button
          type="button"
          aria-pressed={whole}
          onClick={() => toggleMonth()}
          className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold ${whole ? "bg-teal text-white" : "border border-line text-ink hover:bg-teal/5"}`}
        >
          {whole ? "Clear month" : "Whole month"}
        </button>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-ink/45">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}
          {visible.map((iso) => {
            const day = Number(iso.slice(-2));
            const selected = (picked ?? []).includes(iso);
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={selected}
                aria-label={formatDay(iso)}
                onClick={() => toggle(iso)}
                className={`h-8 rounded-md text-sm ${
                  selected ? "bg-teal font-semibold text-white" : iso === todayIso ? "border border-teal text-teal" : "text-ink hover:bg-teal/5"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
      {limit ? <p className="mt-2 text-xs text-clay">That is more than the profile can keep.</p> : null}
      {picked && picked.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectionChips(picked).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => (chip.month ? toggleMonth(chip.month) : chip.iso ? toggle(chip.iso) : undefined)}
              className="rounded-full bg-teal/10 px-3 py-1.5 text-sm font-medium text-teal"
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink/45">Select the days you can help, or choose the whole month.</p>
      )}
    </div>
  );
}

function PrivateProfile({ editing, value, onChange }: { editing: boolean; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-ink">Private profile</p>
        <p className="mt-0.5 text-sm text-ink/45">{value ? "Your profile is private" : "Your profile is public"}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label="Private profile"
        disabled={!editing}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${value ? "bg-teal" : "bg-[#d5d5d5]"} disabled:cursor-default`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${value ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const shown = value?.trim() || "Not added";
  return (
    <div>
      <p className="text-xs text-ink/45">{label}</p>
      <p className={`mt-1 text-sm break-words ${value?.trim() ? "font-semibold text-ink" : "text-ink/40"}`}>{shown}</p>
    </div>
  );
}

function ProfileField({
  label,
  editing,
  value,
  shown,
  onChange,
  inputMode,
}: {
  label: string;
  editing: boolean;
  value: string;
  shown?: string | null;
  onChange: (value: string) => void;
  inputMode?: "numeric" | "text";
}) {
  if (!editing) return <Field label={label} value={shown} />;
  return (
    <label className="grid gap-1 text-xs text-ink/45">
      {label}
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-teal"
      />
    </label>
  );
}

function PhotoField({
  editing,
  shown,
  onPick,
  onRemove,
}: {
  editing: boolean;
  shown: string | null;
  onPick: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <p className="text-xs text-ink/45">Photo</p>
      {shown ? (
        <img src={shown} alt="" className="mt-2 h-16 w-16 rounded-full object-cover" />
      ) : (
        <p className="mt-1 text-sm text-ink/40">Not added</p>
      )}
      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-teal/5">
            Choose photo
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={onPick} />
          </label>
          {shown ? (
            <button type="button" onClick={onRemove} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-teal/5">
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function photoAddress(path: string | null | undefined, version: number) {
  if (!path) return null;
  const stamp = version ? `?v=${version}` : "";
  return `${apiUrl}/uploads/${path}${stamp}`;
}

function fileBody(file: File) {
  const form = new FormData();
  form.append("photo", file);
  return form;
}

