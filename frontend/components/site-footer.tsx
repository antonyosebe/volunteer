import Link from "next/link";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/opportunities", label: "Opportunities" },
      { href: "/organisations", label: "Organisations" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Get involved",
    links: [
      { href: "/register", label: "Register as a volunteer" },
      { href: "/register?account=organisation", label: "Register an organisation" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-orange bg-teal text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-orange px-1.5 text-xs font-semibold tracking-tight" aria-hidden>
              tra
            </span>
            Volunteer
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/75">
            Make a difference wherever you go. Find a local need, or list one for your organisation.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-medium uppercase tracking-wide text-orange">{column.title}</h2>
            <ul className="mt-4 grid gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/80 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-white/60">© 2026 Volunteer</p>
      </div>
    </footer>
  );
}
