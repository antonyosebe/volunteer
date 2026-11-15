import { Suspense } from "react";
import { OpportunityDetail } from "@/components/opportunity-detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-10">Loading opportunity</p>}>
      <PublicOpportunity params={params} />
    </Suspense>
  );
}

async function PublicOpportunity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpportunityDetail id={id} listHref="/opportunities" />;
}
