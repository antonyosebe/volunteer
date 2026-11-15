import Link from "next/link";
import { Notice } from "@/components/page-frame";
import { getJson } from "@/lib/api";

type Item = { id?: string; title?: string; name?: string; location?: string; city?: string };

export async function Directory({
  title,
  path,
  hrefBase,
  empty,
}: {
  title: string;
  path: string;
  hrefBase: string;
  empty: string;
}) {
  const result = await getJson<Item[] | { items?: Item[] }>(path);
  const items = Array.isArray(result.data) ? result.data : result.data?.items ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-forest">{title}</h1>
      <div className="mt-6">
        {result.error ? <Notice>{result.error}</Notice> : null}
        {!result.error && items.length === 0 ? <Notice>{empty}</Notice> : null}
        <ul className="mt-4 grid gap-3">
          {items.map((item, index) => {
            const label = item.title || item.name || "Untitled";
            const id = item.id ?? String(index);
            return (
              <li key={id} className="rounded-xl border border-line bg-card p-4">
                <Link href={`${hrefBase}/${id}`} className="font-medium text-forest">{label}</Link>
                <p className="mt-1 text-sm text-ink/70">{item.location || item.city || ""}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
