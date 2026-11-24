"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/lib/brand";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/opportunities", label: "Opportunities" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-30 bg-teal text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center">
          <BrandMark tone="white" />
        </Link>
        <button
          type="button"
          className="rounded-md px-3 py-2 text-sm md:hidden"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
        <nav
          id="site-nav"
          className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-16 z-20 flex-col gap-3 bg-teal px-4 py-4 md:static md:flex md:flex-row md:items-center md:gap-5 md:bg-transparent md:p-0`}
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm hover:text-orange" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
