"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PublicFrame>{children}</PublicFrame>}>
      <PathFrame>{children}</PathFrame>
    </Suspense>
  );
}

function PathFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/login" || path === "/register" || path === "/app" || path.startsWith("/app/")) {
    return children;
  }

  return <PublicFrame>{children}</PublicFrame>;
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
