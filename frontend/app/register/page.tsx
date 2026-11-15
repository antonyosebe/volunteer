import { Suspense } from "react";
import { RegisterScreen } from "@/components/register-screen";

async function RegisterChooser({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  const account = params.account === "organisation" ? "organisation" : "volunteer";
  return <RegisterScreen account={account} />;
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-white">Loading registration</p>}>
      <RegisterChooser searchParams={searchParams} />
    </Suspense>
  );
}
