import { Suspense } from "react";
import { Directory } from "@/components/directory";

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-10">Loading organisations</p>}>
      <Directory
        title="Organisations"
        path="/api/organisations"
        hrefBase="/organisations"
        empty="No approved organisations yet."
      />
    </Suspense>
  );
}
