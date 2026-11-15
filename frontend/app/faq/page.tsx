import Link from "next/link";

const questions = [
  {
    question: "Do I need an account to browse?",
    answer: "No. You can read organisations and opportunities before you register.",
  },
  {
    question: "When does an opportunity appear publicly?",
    answer: "After the organisation is approved, and only while that listing is posted.",
  },
  {
    question: "How do I apply?",
    answer: "Open an opportunity and send a short note about why you want to help. Applying needs a volunteer account. Log in from the listing and you come back to the same page.",
  },
  {
    question: "Can I apply more than once?",
    answer: "One application per opportunity. After you send it, the status is under Applications.",
  },
  {
    question: "When can an organisation post?",
    answer: "After a platform admin approves it. An approved organisation can have three posted opportunities at a time.",
  },
  {
    question: "Who can edit an organisation?",
    answer: "An organisation admin edits that organisation. You edit only your own profile.",
  },
  {
    question: "Who can see a rating?",
    answer: "A rating is visible only to that volunteer and that organisation.",
  },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-orange">Help</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-teal sm:text-5xl">
          Questions, <span className="font-script text-5xl text-orange sm:text-6xl">answered</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">How browsing, applying, and organisations work on Volunteer.</p>
      </header>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {questions.map((item) => (
          <details key={item.question} className="group rounded-2xl border border-line bg-white px-5 py-4 open:border-teal">
            <summary className="cursor-pointer list-none text-base font-semibold text-teal [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-4">
                {item.question}
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange/10 text-lg leading-none text-orange group-open:rotate-45" aria-hidden>
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-ink/75">{item.answer}</p>
          </details>
        ))}
      </div>
      <p className="mt-10 text-sm text-ink/60">
        Still stuck?{" "}
        <Link href="/contact" className="font-semibold text-teal">
          Write to us
        </Link>
        .
      </p>
    </div>
  );
}
