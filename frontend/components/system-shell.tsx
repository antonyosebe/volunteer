"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { endSession, initials, roleLabel, useSession } from "@/lib/session";

const volunteerLinks = [
  { href: "/app", label: "Dashboard", icon: GridIcon },
  { href: "/app/profile", label: "Profile", icon: PersonIcon },
  { href: "/app/community", label: "Community", icon: CommunityIcon },
  { href: "/app/activities", label: "Activities", icon: ListIcon },
  { href: "/app/applications", label: "Applications", icon: ClipboardIcon },
  { href: "/app/discover", label: "Opportunities", icon: SearchIcon },
];

const adminLinks = [
  { href: "/app", label: "Dashboard", icon: GridIcon },
  { href: "/app/approvals", label: "Approvals", icon: CheckIcon },
  { href: "/app/settings", label: "Settings", icon: GearIcon },
];

const organisationLinks = [
  { href: "/app", label: "Dashboard", icon: GridIcon },
  { href: "/app/organisation", label: "Profile", icon: PersonIcon },
  { href: "/app/opportunities", label: "Opportunities", icon: SearchIcon },
  { href: "/app/applications", label: "Applications", icon: ClipboardIcon },
];

export function SystemShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Workspace path="">{children}</Workspace>}>
      <CurrentWorkspace>{children}</CurrentWorkspace>
    </Suspense>
  );
}

function CurrentWorkspace({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <Workspace path={path}>{children}</Workspace>;
}

function Workspace({ children, path }: { children: React.ReactNode; path: string }) {
  const router = useRouter();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = session?.fullName?.trim() || "Volunteer";
  const organisationAccount = session?.clientType === "org_admin" || session?.clientType === "org_member";
  const links = session?.clientType === "admin" ? adminLinks : organisationAccount ? organisationLinks : volunteerLinks;

  function logOut() {
    setMenuOpen(false);
    endSession();
    router.push("/login");
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper md:flex-row">
        <aside className="flex max-h-[46vh] shrink-0 flex-col overflow-y-auto border-b border-line bg-white md:max-h-none md:w-60 md:border-r md:border-b-0">
          <Link href="/app" className="flex items-center gap-2 px-5 py-5">
            <span className="grid h-9 min-w-9 place-items-center rounded-full bg-orange px-1.5 text-xs font-semibold tracking-tight text-white">
              tra
            </span>
            <span className="text-sm font-semibold text-ink">Volunteer</span>
          </Link>
          <nav aria-label="Workspace" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
            {links.map((link) => {
              const active = link.href === "/app" ? path === "/app" : path.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm whitespace-nowrap ${
                    active
                      ? "border-l-4 border-teal bg-teal/10 font-semibold text-teal"
                      : "text-ink/70 hover:bg-teal/5"
                  }`}
                >
                  <Icon />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-line p-3 pb-12">
            <Link href="/faq" className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink/70 hover:bg-teal/5">
              <HelpIcon />
              Help
            </Link>
            {session?.fullName ? (
              <div>
                {menuOpen ? (
                  <button
                    type="button"
                    onClick={logOut}
                    className="mb-1 flex w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-left text-sm font-medium text-ink shadow-sm hover:bg-teal/5"
                  >
                    Log out
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-teal/5"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal/10 text-xs font-semibold text-teal">
                    {initials(session.fullName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{name}</span>
                    <span className="block truncate text-xs text-ink/50">{roleLabel(session.clientType)}</span>
                  </span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="block rounded-lg px-3 py-2 text-sm font-semibold text-teal">
                Log in
              </Link>
            )}
          </div>
        </aside>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M6 4h8M6 8h8M6 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="3" cy="4" r="1" fill="currentColor" />
      <circle cx="3" cy="8" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3.5" y="3" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 3.2h4V2.5A.5.5 0 0 0 9.5 2h-3a.5.5 0 0 0-.5.5v.7Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 8h4M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="5.5" cy="6" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10.8" cy="6.2" r="1.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.8 12.2c.5-1.7 1.8-2.5 3.7-2.5s3.2.8 3.7 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.2 9.8c1.4.1 2.4.7 2.9 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 13c.7-2.2 2.3-3.2 4.5-3.2S12 10.8 12.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5 13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.2 8.1 7.1 10l3.7-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.4 6.3a1.6 1.6 0 1 1 2.3 1.4c-.5.3-.7.6-.7 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.6" fill="currentColor" />
    </svg>
  );
}
