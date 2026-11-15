import { Suspense } from "react";
import { PageFrame, Notice } from "@/components/page-frame";
import { getJson } from "@/lib/api";

async function Organisation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getJson<{ name?: string; mission?: string }>(`/api/organisations/${id}`);
  return (
    <PageFrame title={result.data?.name ?? "Organisation"}>
      {result.error ? <Notice>{result.error}</Notice> : <p>{result.data?.mission ?? "This organisation has no public description yet."}</p>}
    </PageFrame>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-10">Loading organisation</p>}>
      <Organisation params={params} />
    </Suspense>
  );
}
