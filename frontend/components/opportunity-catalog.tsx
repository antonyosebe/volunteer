import { Notice } from "@/components/page-frame";
import { OpportunityList, type ListedOpportunity } from "@/components/opportunity-list";
import { getJson } from "@/lib/api";

export async function OpportunityCatalog({ basePath, flush = false }: { basePath: string; flush?: boolean }) {
  const result = await getJson<ListedOpportunity[]>("/api/opportunities");
  const items = Array.isArray(result.data) ? result.data : [];
  return (
    <div className={flush ? "px-6 py-6" : "mx-auto max-w-6xl px-4 py-10"}>
      <header className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-teal">
          Opportunities to <span className="font-script text-5xl text-orange">join</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/60">Open a listing to read it and apply. You can browse without an account.</p>
      </header>
      <div className="mt-8">
        {result.error ? <Notice>{result.error}</Notice> : null}
        {!result.error && items.length === 0 ? <Notice>No published opportunities yet.</Notice> : null}
        {!result.error && items.length > 0 ? <OpportunityList items={items} basePath={basePath} /> : null}
      </div>
    </div>
  );
}
