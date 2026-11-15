import { Suspense } from "react";
import { OpportunityDetail } from "@/components/opportunity-detail";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-10">Loading opportunity</p>}>
      <WorkspaceOpportunity params={params} />
    </Suspense>
  );
}

async function WorkspaceOpportunity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpportunityDetail id={id} listHref="/app/discover" flush />;
}
