import { Suspense } from "react";
import { PageFrame, Notice } from "@/components/page-frame";

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageFrame title="Edit opportunity">
      <Notice>Opportunity {id}. Drafts stay private until the organisation publishes them.</Notice>
    </PageFrame>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-10">Loading opportunity</p>}>
      <Editor params={params} />
    </Suspense>
  );
}
