import Link from "next/link";

type Section = {
  title: string;
  paragraphs?: string[];
  items?: { label: string; body: string }[];
};

const sections: Section[] = [
  {
    title: "These terms",
    paragraphs: [
      "Use the site for genuine volunteering. Do not post another person's details or edit a profile that is not yours.",
    ],
  },
  {
    title: "Accounts",
    paragraphs: [
      "You register as a volunteer or as an organisation.",
    ],
  },
  {
    title: "Listings",
    paragraphs: [
      "An organisation posts its own opportunities. A visitor sees a listing only while it is posted.",
    ],
  },
  {
    title: "Applying",
    paragraphs: [
      "Sending an application needs a volunteer account. One application is kept for each opportunity.",
    ],
  },
];

function TermsSection({ section, order }: { section: Section; order: number }) {
  return (
    <section className="mb-8" style={{ order }}>
      <h2 className="text-lg font-semibold text-teal">{section.title}</h2>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-sm leading-7 text-ink/80">
          {paragraph}
        </p>
      ))}
      {section.items ? (
        <div className="mt-4 space-y-4">
          {section.items.map((item) => (
            <div key={item.label} className="text-sm leading-7 text-ink/80">
              <p className="font-semibold text-ink">{item.label}</p>
              <p className="mt-1">{item.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-orange">Terms</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-teal sm:text-5xl">Terms</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">
          How browsing, accounts, listings, and applications work on Volunteer.
        </p>
      </header>
      <div className="mt-10 flex flex-col sm:grid sm:grid-cols-2 sm:items-start sm:gap-x-16">
        {[0, 1].map((column) => (
          <div key={column} className="contents sm:block">
            {sections
              .map((section, index) => ({ section, index }))
              .filter(({ index }) => index % 2 === column)
              .map(({ section, index }) => (
                <TermsSection key={section.title} section={section} order={index} />
              ))}
          </div>
        ))}
      </div>
      <p className="mt-12 text-sm leading-7 text-ink/70">
        Read the{" "}
        <Link href="/privacy" className="font-semibold text-teal">
          Privacy Policy
        </Link>{" "}
        alongside these terms. A question can be sent from the{" "}
        <Link href="/contact" className="font-semibold text-teal">
          contact page
        </Link>
        .
      </p>
    </div>
  );
}
