import { PageFrame, Notice } from "@/components/page-frame";

export default function Page() {
  return (
    <PageFrame title="Verify email">
      <Notice>Open the link from your email. This page will confirm the token when the API is connected.</Notice>
    </PageFrame>
  );
}
