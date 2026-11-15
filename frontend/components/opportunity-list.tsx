"use client";

import { useState } from "react";
import Link from "next/link";

export type ListedOpportunity = {
  id?: string;
  title?: string;
  location?: string | null;
  organisationName?: string | null;
  categoryName?: string | null;
  timeCommitment?: string | null;
  volunteerCount?: number | null;
  isPaid?: boolean;
};

export function OpportunityList({ items, basePath }: { items: ListedOpportunity[]; basePath: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [place, setPlace] = useState("all");
  const [paid, setPaid] = useState("all");
  const categories = unique(items.map((item) => item.categoryName));
  const places = unique(items.map((item) => item.location));
  const needle = query.trim().toLowerCase();
  const shown = items.filter((item) => {
    const haystack = `${item.title ?? ""} ${item.organisationName ?? ""} ${item.location ?? ""}`.toLowerCase();
    if (needle && !haystack.includes(needle)) return false;
    if (category !== "all" && item.categoryName !== category) return false;
    if (place !== "all" && item.location !== place) return false;
    if (paid === "paid" && !item.isPaid) return false;
    if (paid === "unpaid" && item.isPaid) return false;
    return true;
  });

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          aria-label="Search opportunities"
          className="w-56 rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-teal"
        />
        <Filter label="Category" value={category} onChange={setCategory} options={categories} />
        <Filter label="Place" value={place} onChange={setPlace} options={places} />
        <label className="flex items-center gap-2 text-sm text-ink/60">
          Pay
          <select value={paid} onChange={(event) => setPaid(event.target.value)} className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-teal">
            <option value="all">Any</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </label>
      </div>
      {shown.length === 0 ? <p className="mt-8 text-sm text-ink/60">No opportunities match this filter.</p> : null}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item, index) => {
          const facts = [
            item.categoryName,
            item.location,
            item.timeCommitment,
            item.volunteerCount ? `${item.volunteerCount} volunteers` : null,
            item.isPaid ? "Paid" : null,
          ].filter((fact): fact is string => Boolean(fact));
          return (
            <li key={item.id ?? index}>
              <Link href={`${basePath}/${item.id ?? index}`} className="flex h-full flex-col rounded-3xl border border-line bg-white p-5 hover:border-teal">
                {item.organisationName ? <p className="text-xs font-medium uppercase tracking-[0.16em] text-orange">{item.organisationName}</p> : null}
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-teal">{item.title || "Untitled"}</h2>
                {facts.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {facts.map((fact) => (
                      <li key={fact} className="rounded-full bg-paper px-3 py-1 text-sm text-ink/70">
                        {fact}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <span className="mt-6 text-sm font-semibold text-action">View and apply</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink/60">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-teal">
        <option value="all">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function unique(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}
