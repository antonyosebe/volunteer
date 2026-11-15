import { Suspense } from "react";
import { PageFrame, Notice } from "@/components/page-frame";

async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageFrame title="Application review">
      <Notice>Application {id}. Accept, decline, rate, and note are visible only to this organisation and that volunteer.</Notice>
    </PageFrame>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-10">Loading application</p>}>
      <Review params={params} />
    </Suspense>
  );
}
