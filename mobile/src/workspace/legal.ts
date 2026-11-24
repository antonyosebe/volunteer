export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: { label: string; body: string }[];
};

export const termsSections: LegalSection[] = [
  {
    title: "These terms",
    paragraphs: ["Use the site for genuine volunteering. Do not post another person's details or edit a profile that is not yours."],
  },
  {
    title: "Accounts",
    paragraphs: ["You register as a volunteer or as an organisation."],
  },
  {
    title: "Listings",
    paragraphs: ["An organisation posts its own opportunities. A visitor sees a listing only while it is posted."],
  },
  {
    title: "Applying",
    paragraphs: ["Sending an application needs a volunteer account. One application is kept for each opportunity."],
  },
];

export const privacySections: LegalSection[] = [
  {
    title: "This policy",
    paragraphs: [
      "This Privacy Policy explains what Volunteer collects, how that information is used, and who can see it.",
      "Please also read the Terms, which describe how you use the app.",
    ],
  },
  {
    title: "Who we are",
    paragraphs: [
      "Volunteer connects people with organisations that need a hand. You can look for an opportunity, register as a volunteer, or register an organisation.",
    ],
  },
  {
    title: "Information you provide",
    items: [
      {
        label: "Your account and profile",
        body: "You provide your name, email, and a password to create an account. A volunteer can also add a phone number, photo, age, workplace, city, country, and availability.",
      },
      {
        label: "Your application",
        body: "When you apply to an opportunity you send a short note about why you want to help. One application is kept for each opportunity.",
      },
      {
        label: "Your organisation",
        body: "An organisation account provides the organisation name and email, and can add a city and country, plus the details of each opportunity it posts.",
      },
    ],
  },
  {
    title: "Who can see your information",
    items: [
      {
        label: "You",
        body: "You can read and edit your own profile, and you can read the applications you have sent.",
      },
      {
        label: "The organisation you apply to",
        body: "That organisation can read your name, email, and the note you sent, for its own opportunities only.",
      },
      {
        label: "Platform staff",
        body: "An admin can see the accounts, organisations, and listings needed to approve, suspend, flag, or review a report.",
      },
    ],
  },
  {
    title: "Closing an account",
    paragraphs: ["Write to us if you want your account closed. While the account is open, we keep the profile and the applications tied to it."],
  },
];
