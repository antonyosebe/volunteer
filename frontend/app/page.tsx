import Image from "next/image";
import Link from "next/link";
import { TornEdge } from "@/components/torn-edge";

const actions = [
  {
    title: "Find a need",
    text: "Search opportunities by place, skill, and focus.",
    href: "/opportunities",
    label: "Browse opportunities",
  },
  {
    title: "Become a volunteer",
    text: "Create a profile and sign up for one opportunity at a time.",
    href: "/register",
    label: "Create a profile",
  },
  {
    title: "List a need",
    text: "Register your organisation and publish up to three opportunities.",
    href: "/register?account=organisation",
    label: "Register an organisation",
  },
];

const checks = [
  "Browse organisations and opportunities without an account.",
  "An organisation is public only after it is approved.",
  "Each organisation can publish three needs at a time.",
  "Ratings stay visible only to that volunteer and organisation.",
];

export default function Home() {
  return (
    <div>
      <section className="relative isolate min-h-[620px] overflow-hidden text-white">
        <Image
          src="/hero-community.png"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-teal/90 via-teal/65 to-teal/25" />
        <div className="pointer-events-none absolute -right-20 -top-24 hidden h-64 w-64 rounded-full bg-orange sm:block" aria-hidden />
        <div className="relative mx-auto flex min-h-[620px] max-w-3xl flex-col items-center justify-center px-4 pb-24 text-center">
          <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
            Make a <span className="font-script text-5xl text-orange sm:text-7xl">difference</span> wherever you go.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
            Discover local organisations and sign up for volunteer opportunities, whether you live there or you are passing through.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/opportunities" className="rounded-full bg-action px-5 py-3 text-sm font-medium text-white hover:bg-action/90">
              Discover opportunities
            </Link>
            <Link href="/register?account=organisation" className="rounded-full border border-white px-5 py-3 text-sm font-medium hover:bg-white/10">
              Register an organisation
            </Link>
          </div>
        </div>
        <TornEdge />
      </section>

      <section className="relative z-10 -mt-16 px-4">
        <ul className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {actions.map((action) => (
            <li key={action.title} className="rounded-2xl bg-card p-6 shadow-lg">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-orange/10 text-orange" aria-hidden>
                <ActionMark kind={action.title} />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-teal">{action.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/75">{action.text}</p>
              <Link href={action.href} className="mt-4 inline-block text-sm font-medium text-action">
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
        <div className="relative">
          <Image
            src="/mission-volunteers.png"
            alt="Raised hands painted in bright colours"
            width={900}
            height={680}
            className="h-auto w-full rounded-3xl object-cover"
          />
          <p className="absolute -left-2 top-6 grid h-28 w-28 place-items-center rounded-full bg-orange px-3 text-center text-sm font-semibold leading-tight text-white sm:-left-6">
            Wherever you go
          </p>
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-orange">Why Volunteer</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-teal sm:text-4xl">
            Your time <span className="font-script text-4xl text-orange sm:text-5xl">helps</span> people where you are.
          </h2>
          <ul className="mt-6 grid gap-3">
            {checks.map((check) => (
              <li key={check} className="flex gap-3 text-sm leading-6">
                <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange text-xs text-white" aria-hidden>
                  ✓
                </span>
                {check}
              </li>
            ))}
          </ul>
          <Link href="/about" className="mt-8 inline-block rounded-full bg-action px-5 py-3 text-sm font-medium text-white hover:bg-action/90">
            Discover more
          </Link>
        </div>
      </section>
    </div>
  );
}

function ActionMark({ kind }: { kind: string }) {
  if (kind === "Become a volunteer") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19c1.5-3 3.8-4.5 7-4.5S17.5 16 19 19" />
      </svg>
    );
  }
  if (kind === "List a need") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20V8l8-4 8 4v12" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

