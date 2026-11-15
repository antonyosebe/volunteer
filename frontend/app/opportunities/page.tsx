import { Suspense } from "react";
import { OpportunityCatalog } from "@/components/opportunity-catalog";

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-10">Loading opportunities</p>}>
      <OpportunityCatalog basePath="/opportunities" />
    </Suspense>
  );
}
