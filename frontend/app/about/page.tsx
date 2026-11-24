import Image from "next/image";
import Link from "next/link";
import { TornEdge } from "@/components/torn-edge";

const steps = [
  {
    title: "Discover",
    text: "Search organisations and opportunities by place, skill, and focus. You can look around before you create an account.",
  },
  {
    title: "Sign up",
    text: "Apply once to an opportunity. The organisation reviews your answers and any documents you attach.",
  },
  {
    title: "Show up",
    text: "After a decision, you see the status under My activities. The organisation can accept, decline, rate, and leave a note.",
  },
];

export default function Page() {
  return (
    <div>
      <section className="relative isolate min-h-[420px] overflow-hidden text-white">
        <Image src="/hero-community.png" alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-teal/90 via-teal/70 to-teal/35" />
        <div className="relative mx-auto flex min-h-[420px] max-w-3xl flex-col items-center justify-center px-4 pb-16 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-orange">About us</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-6xl">
            A place to <span className="font-script text-5xl text-orange sm:text-7xl">help</span> wherever you are.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
            Volunteer connects people with organisations that need a hand, whether you live there or you are passing through.
          </p>
        </div>
        <TornEdge />
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
        <Image
          src="/mission-volunteers.png"
          alt="Raised hands painted in bright colours"
          width={900}
          height={680}
          className="h-auto w-full rounded-3xl object-cover"
        />
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-orange">The idea</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-teal sm:text-4xl">
            Make a difference wherever you go.
          </h2>
          <p className="mt-4 text-sm leading-7 text-ink/80">
            Organisations publish the help they need. Volunteers read the details, apply once, and follow the decision from their own activities.
          </p>
          <p className="mt-3 text-sm leading-7 text-ink/80">
            You edit only your own profile and your own organisation. Applicant documents stay with that organisation and platform staff.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-medium uppercase tracking-wide text-orange">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold text-teal">From a listing to a visit</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-line bg-paper p-6">
                <p className="text-sm font-semibold text-orange">0{index + 1}</p>
                <h3 className="mt-2 text-xl font-semibold text-teal">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/75">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-full bg-teal px-5 py-3 text-sm font-medium text-white hover:bg-teal/90">
              Register as a volunteer
            </Link>
            <Link href="/register?account=organisation" className="rounded-full border border-teal px-5 py-3 text-sm font-medium text-teal hover:bg-teal hover:text-white">
              Register an organisation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
