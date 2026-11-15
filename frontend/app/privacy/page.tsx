import Link from "next/link";

type Section = {
  title: string;
  paragraphs?: string[];
  items?: { label: string; body: string }[];
};

const sections: Section[] = [
  {
    title: "This policy",
    paragraphs: [
      "This Privacy Policy explains what Volunteer collects, how that information is used, and who can see it. It applies to the Volunteer website.",
      "Please also read the Terms, which describe how you use the site.",
    ],
  },
  {
    title: "Who we are",
    paragraphs: [
      "Volunteer connects people with organisations that need a hand. You can look for an opportunity, register as a volunteer, or register an organisation.",
      "When you create an account, post a listing, or send an application, Volunteer is responsible for the personal information you give us for that purpose. A question about this policy can be sent from the contact page.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: [
      "We collect the information needed to run accounts, listings, and applications. The details we hold depend on whether you are browsing, volunteering, or registering an organisation.",
    ],
  },
  {
    title: "Information you provide",
    items: [
      {
        label: "Your account and profile",
        body: "You provide your name, email, and a password to create an account. A volunteer can also add a phone number, photo, age, skills, hobbies, focus areas, workplace, city, country, and availability.",
      },
      {
        label: "Your application",
        body: "When you apply to an opportunity you send a short note about why you want to help. One application is kept for each opportunity. A file you attach later is stored with that application.",
      },
      {
        label: "Your organisation",
        body: "An organisation account provides the organisation name and email, and can add a city and country. An organisation also provides the details of each opportunity it posts, including the title, description, place, dates, and whether the role is paid.",
      },
      {
        label: "Messages to us",
        body: "If you use the contact page, you provide your name, email, and the message you want us to read.",
      },
    ],
  },
  {
    title: "Information recorded as you use the site",
    paragraphs: [
      "We record when an account is created, when an application is sent, and the status of an account, an organisation, a listing, and an application.",
      "Signing in keeps your session in this browser until you log out. Volunteer does not collect a precise device location, and it does not use the site to serve advertising.",
    ],
  },
  {
    title: "How we use information",
    items: [
      {
        label: "To run the site",
        body: "We use your information to create your account, show your profile to you, list an approved organisation, publish a posted opportunity, and deliver an application to the organisation that posted it.",
      },
      {
        label: "To keep the site in order",
        body: "A platform admin uses account and listing information to approve, reject, suspend, or flag an organisation or a listing, and to review a report.",
      },
      {
        label: "To reply to you",
        body: "We use the name, email, and message you send on the contact page so we can answer you. We also use the email on an account when you ask us to close it.",
      },
    ],
  },
  {
    title: "Who can see your information",
    items: [
      {
        label: "Anyone visiting the site",
        body: "A visitor can read an approved organisation and an opportunity while that listing is posted. That public view is the organisation name, the place when one has been added, and the opportunity details.",
      },
      {
        label: "You",
        body: "You can read and edit your own profile. You can read the applications you have sent. A rating written about you is visible to you and to that organisation.",
      },
      {
        label: "The organisation you apply to",
        body: "That organisation can read your name, email, and the note you sent, for its own opportunities only. A file attached to the application is visible to that organisation and to platform admins.",
      },
      {
        label: "An organisation admin",
        body: "An organisation admin edits that organisation. You edit only your own profile. Members of an organisation see applicants only for opportunities they own.",
      },
      {
        label: "Platform staff",
        body: "Staff sign in separately from volunteers and organisation people. An admin can see the accounts, organisations, and listings needed to approve, suspend, flag, or review a report.",
      },
    ],
  },
  {
    title: "Closing an account",
    paragraphs: [
      "Write to us if you want your account closed. We use the email on the account to confirm that the request is yours. While the account is open, we keep the profile and the applications tied to it.",
    ],
  },
  {
    title: "Changes to this policy",
    paragraphs: [
      "We may update this page when the site changes. The page you are reading is the current policy.",
    ],
  },
];

function PolicySection({ section, order }: { section: Section; order: number }) {
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
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-orange">Privacy</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-teal sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink/60">
          What Volunteer collects, how it is used, and who can see a profile, an application, a document, and a rating.
        </p>
      </header>
      <div className="mt-10 flex flex-col sm:grid sm:grid-cols-2 sm:items-start sm:gap-x-16">
        {[0, 1].map((column) => (
          <div key={column} className="contents sm:block">
            {sections
              .map((section, index) => ({ section, index }))
              .filter(({ index }) => index % 2 === column)
              .map(({ section, index }) => (
                <PolicySection key={section.title} section={section} order={index} />
              ))}
          </div>
        ))}
      </div>
      <p className="mt-12 text-sm leading-7 text-ink/70">
        Read the{" "}
        <Link href="/terms" className="font-semibold text-teal">
          Terms
        </Link>{" "}
        alongside this policy. A question about your details can be sent from the{" "}
        <Link href="/contact" className="font-semibold text-teal">
          contact page
        </Link>
        .
      </p>
    </div>
  );
}
