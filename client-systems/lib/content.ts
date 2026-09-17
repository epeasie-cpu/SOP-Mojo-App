export type ContentType = "home" | "page" | "utility";

export type FaqItem = {
  question: string;
  answer: string;
};

export type HowToStep = {
  name: string;
  text: string;
};

export type ContentSection = {
  heading: string;
  body: string[];
};

export type ContentEntry = {
  path: string;
  keyword: string;
  heading: string;
  description: string;
  type: ContentType;
  parent: string | null;
  lastmod: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
  index: boolean;
  lede?: string;
  sections?: ContentSection[];
  faqs?: FaqItem[];
  howTo?: { name: string; description: string; steps: HowToStep[] };
};

const LASTMOD = "2026-09-17";

export const SHARED_FAQS: FaqItem[] = [
  {
    question: "What is SOP Mojo Client Systems?",
    answer:
      "Client Systems is the SOP Mojo product workspace for client onboarding systems for small and midsize businesses. You run intake, sales-to-delivery handoff, access SLAs, and the onboarding board in the browser at clients.sopmojo.com. It is not a Notion template marketplace, not ClickUp, and not a duplicated Airtable.",
  },
  {
    question: "Is this a Notion or ClickUp template?",
    answer:
      "No. Buyers do not duplicate a Notion doc or a ClickUp list. They invite teammates and run client onboarding in this workspace. The Client Systems Kit is the operating blueprint; this app is where the kit runs.",
  },
  {
    question: "How does this relate to AI SOP Writer and SOP Builder Pro?",
    answer:
      "Client Systems runs the client engagement. AI SOP Writer (writer.sopmojo.com) drafts standard operating procedures. SOP Builder Pro (builder.sopmojo.com) is the living SOP system. The SOP Library lives at www.sopmojo.com/soplibrary.",
  },
  {
    question: "What does the Client Systems Kit cost?",
    answer:
      "The Client Systems Kit is $39. That is the kit price, not a claim about workspace seats, usage caps, or a subscription. The workspace at clients.sopmojo.com is where you run the kit. Sales and marketing may refine packaging; this page does not invent billing plans.",
  },
];

export const CONTENT: ContentEntry[] = [
  {
    path: "/",
    keyword: "Client onboarding workspace",
    heading: "Client onboarding systems for SMBs — not another template dump",
    description:
      "SOP Mojo Client Systems is a client onboarding workspace: intake, handoff, access SLAs, and a 31-task board in the browser. Not Notion, not ClickUp, not a duplicated Airtable.",
    type: "home",
    parent: null,
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 1,
    index: true,
    lede: "Client Systems is the SOP Mojo product workspace for the Client Systems Kit. Invite the team. Capture intake. Gate delivery on a real handoff. Run access SLAs and the onboarding board at clients.sopmojo.com.",
    sections: [
      {
        heading: "A workspace, not a file you duplicate",
        body: [
          "Agencies lose the first two weeks of a client when onboarding lives in someone’s Notion, a ClickUp list nobody owns, or an Airtable base copied from the last job. Client Systems is the buyer-facing place to run the work: a URL, teammates, and the record that sales and delivery both have to stand behind.",
          "SOP Mojo Client Systems means client onboarding systems for small and midsize businesses. It does not mean a template marketplace. The kit is the blueprint. This app is the operating surface.",
        ],
      },
      {
        heading: "What you run here",
        body: [
          "Intake captures the client, commercial facts, brand-kit status, success metric, and constraints. Handoff is a gate: account lead and delivery lead both confirm before the 31-task board seeds. Access items get SLAs — brand kit marked Later is kickoff plus three days. Overdue access creates a blocked task for the account lead.",
          "When you need a procedure written, use AI SOP Writer. When the procedure has to live, use SOP Builder Pro. Downloadable SOP Mojo products stay in the SOP Library.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-onboarding-checklist",
    keyword: "Client Onboarding Checklist",
    heading: "Client onboarding checklist: four columns, 31 tasks, one owner each",
    description:
      "The Client Systems onboarding checklist is a 31-task board — pre-kickoff, kickoff day, week 1, stabilize — seeded when handoff completes. Not a Notion checklist you copy.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.9,
    index: true,
    lede: "A client onboarding checklist that is not a PDF in a drive. Client Systems seeds 31 Blueprint A tasks across pre-kickoff, kickoff day, week 1, and stabilize when the sales-to-delivery handoff is marked Complete.",
    sections: [
      {
        heading: "The four columns",
        body: [
          "Pre-kickoff files the contract, invoice, client record, workspace, access request, welcome packet, attendees, internal briefing, scope, and brand-kit SLA. Kickoff day locks outcomes, channel, change approver, access gaps, milestone 1, recap, and the decision log.",
          "Week 1 chases access, ships the first artifact, collects feedback against the stated SLA, logs blockers, confirms measurement, aligns third parties, and runs the checkpoint. Stabilize closes remaining access, proves the cadence without the founder, checkpoints metrics, captures operating notes for SOP Builder Pro, reconfirms commercial facts, and marks onboarding complete.",
        ],
      },
      {
        heading: "Why this is not a Notion checklist",
        body: [
          "A duplicated checklist does not assign due dates from kickoff, does not escalate overdue access, and does not care whether delivery accepted the handoff. This board is generated in the Client Systems workspace after both leads confirm. Run it at clients.sopmojo.com.",
        ],
      },
    ],
    howTo: {
      name: "How to run the Client Systems onboarding checklist",
      description:
        "Turn a completed sales-to-delivery handoff into a 31-task onboarding board.",
      steps: [
        {
          name: "Finish intake",
          text: "Create the project in Client Systems with client facts, kickoff date, leads, and brand-kit status.",
        },
        {
          name: "Complete handoff",
          text: "Account lead and delivery lead both confirm. Status becomes Complete.",
        },
        {
          name: "Work the seeded board",
          text: "Thirty-one tasks land in four columns with owners and due rules relative to kickoff.",
        },
        {
          name: "Escalate access misses",
          text: "Later or unreceived access past the SLA creates a blocked task for the account lead.",
        },
      ],
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-proposal-template",
    keyword: "Client Proposal Template",
    heading: "Client proposal template: what must survive the handoff",
    description:
      "A client proposal template for SOP Mojo Client Systems: deal ID, scope, investment, and promises that delivery has to accept — not a pretty deck that dies in email.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.8,
    index: true,
    lede: "The proposal is not the workspace. But every promise in it has to land in Client Systems or delivery will discover it on kickoff day. Capture deal ID, proposal link, in-scope, out-of-scope, investment, and payment terms on the project record.",
    sections: [
      {
        heading: "Fields that must transfer",
        body: [
          "Engagement name, deal ID, proposal ID or link, total investment, payment terms, in-scope, out-of-scope, success metric, hard nos, and the three risks sales already knows. Handoff stores commercial notes, payment notes, and scope promises so delivery is not guessing.",
          "If it was promised on a call and it is not on the handoff, it is not in the engagement. Client Systems is where that rule is enforced — not in a Notion proposal gallery.",
        ],
      },
      {
        heading: "After the proposal is signed",
        body: [
          "Intake and handoff are the next two gates. The board does not seed until both leads confirm. Draft SOPs for the delivery work in AI SOP Writer; keep the living procedures in SOP Builder Pro.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-welcome-pack",
    keyword: "Client Welcome Pack",
    heading: "Client welcome pack generated at handoff, not at the sale",
    description:
      "Client Systems generates a copyable welcome draft when handoff completes — kickoff date, success metric, leads, and access deadline. A welcome pack that is not a forgotten Notion page.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.8,
    index: true,
    lede: "A welcome pack sent the day the contract is signed, before delivery has accepted the job, is a lie waiting to happen. Client Systems generates the welcome draft when handoff is Complete — with kickoff, metric, leads, and the access deadline.",
    sections: [
      {
        heading: "What the draft contains",
        body: [
          "Engagement name, client owner, kickoff date, success metric, end state, account lead, delivery lead, primary channel, and when outstanding access is due. v1 shows a copyable draft in the workspace. It does not pretend to send email for you.",
          "The welcome packet task still sits on the pre-kickoff column. The generated draft is the starting text. Edit it. Send it on your channel. Keep the source of truth in Client Systems.",
        ],
      },
      {
        heading: "Related operating assets",
        body: [
          "Write the welcome-and-kickoff SOP in AI SOP Writer if the steps are still tribal. Put the approved version in SOP Builder Pro. Kit downloads live in the SOP Library.",
        ],
      },
    ],
    howTo: {
      name: "How to produce the Client Systems welcome draft",
      description:
        "Generate a client welcome pack draft from a completed handoff.",
      steps: [
        {
          name: "Confirm both leads",
          text: "Account lead completes handoff. Delivery lead accepts.",
        },
        {
          name: "Save Complete",
          text: "Client Systems seeds the board and writes the welcome draft from intake and project fields.",
        },
        {
          name: "Copy and send",
          text: "Copy the draft into your primary channel. Do not wait for a meeting to ship it.",
        },
      ],
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-intake-form",
    keyword: "Client Intake Form",
    heading: "Client intake form: the fields that become the client record",
    description:
      "The Client Systems client intake form captures identity, contacts, outcomes, tools, brand kit, access, and commercial facts — then writes the workspace record. Not a Typeform that never reaches delivery.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.9,
    index: true,
    lede: "Intake is not a survey. It is the client record. Client Systems walks identity, people, outcomes, scope, access, and engagement so the project is usable on day one.",
    sections: [
      {
        heading: "What gets captured",
        body: [
          "Client name, legal name, website, industry, size, owner, day-to-day and billing contacts, timezone, hours, end state, success metric, failure definition, deadlines, tools, constraints, must-haves, out of scope, third parties, brand-kit status (Yes / No / Later), analytics, prior creative, compliance, channel, feedback SLA, change approver, PO, invoice email, payment terms, contract status, and risks.",
          "Brand kit Yes requires a URL. Brand kit Later sets a pending SLA three days after kickoff. Analytics and other Later items use the project access-deadline offset.",
        ],
      },
      {
        heading: "Where the form lives",
        body: [
          "You fill it in the workspace at /app/projects/new — not in a Notion database you duplicate per client. Create a workspace, then run intake there. Teammates join by invite email.",
        ],
      },
    ],
    howTo: {
      name: "How to complete Client Systems intake",
      description:
        "Turn a new engagement into a client record and project in the workspace.",
      steps: [
        {
          name: "Create or join a workspace",
          text: "Sign up at clients.sopmojo.com or accept an invite.",
        },
        {
          name: "Open new project",
          text: "Walk the intake wizard: client, people, outcomes, scope, access, engagement.",
        },
        {
          name: "Set brand kit honestly",
          text: "Yes needs a URL. Later gets kickoff plus three days. No is logged as cannot provide.",
        },
        {
          name: "Hand off next",
          text: "Do not seed the board until account lead and delivery lead both confirm.",
        },
      ],
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/agency-client-onboarding",
    keyword: "Agency Client Onboarding",
    heading: "Agency client onboarding without ClickUp theater",
    description:
      "Agency client onboarding for SMBs in SOP Mojo Client Systems: one workspace, a handoff gate, access SLAs, and a seeded board. Not ClickUp, not Notion, not a copied Airtable.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.9,
    index: true,
    lede: "Agency client onboarding fails in the gap between the sale and the first artifact. Client Systems is built for that gap: commercial facts, delivery acceptance, access with deadlines, and a board that does not exist until the handoff is real.",
    sections: [
      {
        heading: "The agency failure mode",
        body: [
          "Sales promises a kickoff. Delivery inherits a Slack thread. Brand files are “coming.” The founder still runs the first two weeks. ClickUp statuses look busy. Nothing has an owner with a date.",
          "Client Systems makes the gate visible. If delivery has not accepted, the 31 tasks are not there yet. If brand kit is Later, the SLA is on the access list. If that SLA expires, the account lead gets a blocked task.",
        ],
      },
      {
        heading: "Where SOPs and the library fit",
        body: [
          "Document how your agency onboards in AI SOP Writer. Keep the approved onboarding SOP in SOP Builder Pro. The Client Systems Kit and other downloads sit in the SOP Library. This workspace is the run-time for the client, not a second wiki.",
        ],
      },
    ],
    howTo: {
      name: "How an agency runs a client in Client Systems",
      description:
        "Take a signed agency engagement from intake through a stable cadence.",
      steps: [
        {
          name: "Intake the client",
          text: "Record the buyer, metric, scope, brand kit, and commercial facts in the workspace.",
        },
        {
          name: "Handoff to delivery",
          text: "Account lead completes. Delivery lead accepts. Welcome draft appears.",
        },
        {
          name: "Run the board",
          text: "Work pre-kickoff through stabilize. Chase access daily in week 1.",
        },
        {
          name: "Stabilize",
          text: "Cadence runs without the founder. Capture operating notes for SOP Builder Pro.",
        },
      ],
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/how-it-works",
    keyword: "How Client Systems Works",
    heading: "How Client Systems works",
    description:
      "How SOP Mojo Client Systems works: signup, intake, dual-confirm handoff, seeded 31-task board, access SLAs, optional Slack. Client onboarding systems for SMBs.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.8,
    index: true,
    lede: "Four gates. No status theater. The board does not exist until delivery accepts the job.",
    sections: [
      {
        heading: "1. Open a workspace",
        body: [
          "Create an account at clients.sopmojo.com. One workspace per buyer account. Invite teammates by email list. This is the URL the client onboarding actually runs on.",
        ],
      },
      {
        heading: "2. Intake the engagement",
        body: [
          "New project is a wizard: client, people, outcomes, scope, access, engagement. Brand kit Later is an honest state — it creates a three-day post-kickoff SLA instead of a pretend Yes.",
        ],
      },
      {
        heading: "3. Complete handoff",
        body: [
          "Account lead and delivery lead both confirm. That seeds the 31 Blueprint A tasks and writes a welcome draft you can copy. v1 does not send the email for you.",
        ],
      },
      {
        heading: "4. Operate access and the board",
        body: [
          "Move tasks TODO / DOING / BLOCKED / DONE. Overdue Later access creates an escalation for the account lead. Optional Slack webhook gets a post. Cron and project page-load both run the check.",
        ],
      },
    ],
    howTo: {
      name: "How to run a client in SOP Mojo Client Systems",
      description:
        "From workspace signup to a seeded onboarding board with access SLAs.",
      steps: [
        {
          name: "Sign up",
          text: "Create a workspace or join from an invite email.",
        },
        {
          name: "Complete intake",
          text: "Create the project with kickoff, leads, scope, and brand-kit status.",
        },
        {
          name: "Confirm handoff",
          text: "Both account lead and delivery lead check complete.",
        },
        {
          name: "Work the board and access list",
          text: "Use the four columns. Treat overdue access as a blocked account-lead task.",
        },
      ],
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/pricing",
    keyword: "Client Systems Pricing",
    heading: "Client Systems Kit is $39. The workspace is where you run it.",
    description:
      "Client Systems Kit is $39. SOP Mojo Client Systems is the workspace for running that kit. No fake seat counts, discounts, or invented subscription plans.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Soft pricing, stated plainly. The Client Systems Kit is $39. This site is the product workspace that runs the kit. We do not invent a SaaS price list here.",
    sections: [
      {
        heading: "What $39 is",
        body: [
          "Thirty-nine dollars is the Client Systems Kit — the SOP Mojo product blueprint for client onboarding systems. Find kit downloads with other SOP Mojo products in the SOP Library. If packaging changes, Sales and Marketing will say so. This page will not invent a launch coupon or a seat-count slogan.",
        ],
      },
      {
        heading: "What the workspace is",
        body: [
          "clients.sopmojo.com is where you create a workspace, invite teammates, and run intake / handoff / board / access. Access today is account-based (email and password, one workspace per buyer, invites by email list). Billing for workspace seats is not defined on this page. Do not read $39 as a monthly plan.",
        ],
      },
      {
        heading: "Related products",
        body: [
          "AI SOP Writer drafts procedures. SOP Builder Pro is the living SOP system. Neither is bundled by a fake “platform fee” on this page. Use each product for its job.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/faq",
    keyword: "Client Systems FAQ",
    heading: "Client Systems FAQ",
    description:
      "FAQ for SOP Mojo Client Systems: what it is, why it is not Notion or ClickUp, kit price ($39), Writer, Builder Pro, and the SOP Library.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Short answers. Client Systems is the onboarding workspace. The kit is $39. The board seeds after handoff. Related products stay on their own hosts.",
    faqs: [
      ...SHARED_FAQS,
      {
        question: "When does the onboarding board appear?",
        answer:
          "When handoff status is Complete — account lead and delivery lead have both confirmed. Then 31 Blueprint A tasks seed across four columns.",
      },
      {
        question: "What happens if brand kit is Later?",
        answer:
          "Client Systems sets an access SLA three days after kickoff. If it is still unreceived past that date, the account lead gets a blocked escalation task.",
      },
      {
        question: "Do you send the welcome email?",
        answer:
          "Not in v1. Completing handoff generates a copyable welcome draft in the workspace. You send it on the channel you locked in intake.",
      },
      {
        question: "Where do I write the actual SOPs?",
        answer:
          "AI SOP Writer at writer.sopmojo.com for first drafts. SOP Builder Pro at builder.sopmojo.com for the living system. The library is www.sopmojo.com/soplibrary.",
      },
    ],
  },
  {
    path: "/sitemap",
    keyword: "HTML Sitemap",
    heading: "Sitemap",
    description:
      "HTML sitemap for Client Systems: every crawlable marketing page on clients.sopmojo.com.",
    type: "utility",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 0.3,
    index: true,
  },
  {
    path: "/search",
    keyword: "Search Client Systems",
    heading: "Search",
    description: "Search Client Systems marketing pages.",
    type: "utility",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 0.2,
    index: false,
  },
];

const byPath = new Map(CONTENT.map((entry) => [entry.path, entry]));

export function getEntry(path: string): ContentEntry {
  const entry = byPath.get(path);
  if (!entry) {
    throw new Error(`Unknown content path: ${path}`);
  }
  return entry;
}

export function pagesForSitemap(): ContentEntry[] {
  return CONTENT.filter((entry) => entry.index);
}

export function indexedContent(): ContentEntry[] {
  return CONTENT.filter((entry) => entry.index);
}

export function breadcrumbsFor(path: string): ContentEntry[] {
  const crumbs: ContentEntry[] = [];
  let current = byPath.get(path);
  const guard = new Set<string>();
  while (current && !guard.has(current.path)) {
    guard.add(current.path);
    crumbs.unshift(current);
    current = current.parent ? byPath.get(current.parent) : undefined;
  }
  if (crumbs[0]?.path !== "/") {
    const home = byPath.get("/");
    if (home) crumbs.unshift(home);
  }
  return crumbs;
}

export function searchContent(query: string): ContentEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return indexedContent();
  return indexedContent().filter((entry) => {
    const hay = [
      entry.keyword,
      entry.heading,
      entry.description,
      entry.lede ?? "",
      ...(entry.sections ?? []).flatMap((section) => [section.heading, ...section.body]),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export const REQUIRED_MARKETING_PATHS = [
  "/",
  "/client-onboarding-checklist",
  "/client-proposal-template",
  "/client-welcome-pack",
  "/client-intake-form",
  "/agency-client-onboarding",
  "/how-it-works",
  "/pricing",
  "/faq",
] as const;
