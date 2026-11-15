"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { OpportunityForm } from "@/components/opportunity-form";

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-5 text-sm text-ink/60">Reading opportunity.</p>}>
      <EditOpportunity />
    </Suspense>
  );
}

function EditOpportunity() {
  const params = useParams<{ id: string }>();
  return <OpportunityForm opportunityId={params.id} />;
}
