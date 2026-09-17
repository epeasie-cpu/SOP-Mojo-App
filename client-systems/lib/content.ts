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
      "Client Systems is the workspace you run after the client says yes: proposal facts into a record, welcome draft, sales-to-delivery handoff, then onboarding. It is client onboarding systems for SMBs at clients.sopmojo.com. It is not AI SOP Writer, not a Notion template marketplace, and not ClickUp.",
  },
  {
    question: "Is this a Notion or ClickUp template?",
    answer:
      "No. You do not duplicate a Notion doc or a ClickUp list. You invite teammates and run the client path in this workspace. The $39 Client Systems Kit is the blueprint; this app is where it runs.",
  },
  {
    question: "Is Client Systems the same as AI SOP Writer?",
    answer:
      "No. Client Systems runs the client after yes. AI SOP Writer drafts standard operating procedures at writer.sopmojo.com. SOP Builder Pro is the living SOP system at builder.sopmojo.com.",
  },
  {
    question: "What does the Client Systems Kit cost?",
    answer:
      "The kit is $39. That is the kit, not a workspace subscription or a seat plan. Start free in the Client Systems workspace; buy the kit when you want the packaged blueprint.",
  },
];

export const CONTENT: ContentEntry[] = [
  {
    path: "/",
    keyword: "Client Systems",
    heading: "After yes: proposal, welcome, onboard — in one workspace",
    description:
      "SOP Mojo Client Systems is the client path after yes. Run proposal facts, welcome, sales-to-delivery handoff, and onboarding at clients.sopmojo.com. Not SOP Writer. Not a Notion or ClickUp template marketplace.",
    type: "home",
    parent: null,
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 1,
    index: true,
    lede: "The contract is signed. Client Systems is where sales hands the job to delivery and onboarding actually runs — intake, handoff gate, access SLAs, and the board. This is not AI SOP Writer, and it is not a template you duplicate in Notion or ClickUp.",
    sections: [
      {
        heading: "The path after yes",
        body: [
          "Proposal facts have to survive the sale. The welcome has to wait until delivery accepts. Onboarding has to be a board with owners, not a status column that looks busy. Client Systems is that path: proposal → welcome → onboard.",
          "Start free in the workspace. Get the $39 Kit if you want the packaged blueprint. Draft SOPs in Writer and keep living procedures in Builder Pro — those are different products on different hosts.",
        ],
      },
      {
        heading: "What you do not get here",
        body: [
          "You do not get an SOP generator. That is AI SOP Writer. You do not get a Notion marketplace template or a ClickUp list to copy. You get a URL, teammates, and a record sales and delivery both have to stand behind.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-onboarding",
    keyword: "Client Onboarding",
    heading: "Client onboarding after the yes — not a copied workspace",
    description:
      "Client onboarding in SOP Mojo Client Systems: after yes, run intake, handoff, access, and the board in the browser. Not Notion, not ClickUp, not SOP Writer.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 0.95,
    index: true,
    lede: "Client onboarding starts when the buyer says yes — not when someone duplicates last quarter’s Airtable. Client Systems is the run-time: capture the client, complete sales-to-delivery handoff, then work the board.",
    sections: [
      {
        heading: "After yes, before the first artifact",
        body: [
          "The gap that kills agencies is the two weeks after signature. Sales promised a kickoff. Delivery inherited a thread. Brand files are “coming.” Client Systems puts that gap on a URL the team shares.",
          "Intake writes the client record. Handoff is the gate. The 31-task board does not seed until both leads confirm. Access items get SLAs. That is onboarding as an operating system, not as a template marketplace.",
        ],
      },
      {
        heading: "Related stops on the path",
        body: [
          "Proposal facts belong on the project. The welcome draft appears when handoff completes. The checklist is the board. The kit is $39 if you want the packaged blueprint. Writer and Builder Pro are for procedures, not for this client path.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-onboarding-checklist",
    keyword: "Client Onboarding Checklist",
    heading: "Client onboarding checklist: 31 tasks after handoff, not a Notion list",
    description:
      "The Client Systems onboarding checklist is a 31-task board — pre-kickoff, kickoff day, week 1, stabilize — seeded when sales-to-delivery handoff completes.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.9,
    index: true,
    lede: "A client onboarding checklist that is not a PDF and not a Notion to-do. Client Systems seeds 31 Blueprint A tasks across four columns when the sales-to-delivery handoff is Complete.",
    sections: [
      {
        heading: "The four columns",
        body: [
          "Pre-kickoff files the contract, invoice, client record, workspace, access request, welcome packet, attendees, internal briefing, scope, and brand-kit SLA. Kickoff day locks outcomes, channel, change approver, access gaps, milestone 1, recap, and the decision log.",
          "Week 1 chases access, ships the first artifact, collects feedback, logs blockers, confirms measurement, aligns third parties, and runs the checkpoint. Stabilize closes remaining access, proves the cadence without the founder, checkpoints metrics, captures notes for SOP Builder Pro, reconfirms commercial facts, and marks onboarding complete.",
        ],
      },
      {
        heading: "Why this is not a Notion checklist",
        body: [
          "A duplicated checklist does not date tasks from kickoff, does not escalate overdue access, and does not care whether delivery accepted the job. This board is generated in Client Systems after both leads confirm.",
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
          name: "Complete sales-to-delivery handoff",
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
    heading: "Client proposal template: what must survive the yes",
    description:
      "A client proposal template for Client Systems: deal ID, scope, investment, and promises that delivery has to accept after yes — not a deck that dies in email.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.85,
    index: true,
    lede: "After yes, the proposal is only as good as what lands in the workspace. Capture deal ID, proposal link, in-scope, out-of-scope, investment, and payment terms on the Client Systems project so delivery is not guessing.",
    sections: [
      {
        heading: "Fields that must transfer",
        body: [
          "Engagement name, deal ID, proposal ID or link, total investment, payment terms, in-scope, out-of-scope, success metric, hard nos, and the three risks sales already knows. Handoff stores commercial notes, payment notes, and scope promises.",
          "If it was promised on a call and it is not on the handoff, it is not in the engagement. That rule lives in Client Systems — not in a Notion proposal gallery.",
        ],
      },
      {
        heading: "Next on the path",
        body: [
          "Welcome waits for handoff Complete. Onboarding is the seeded board. This page is not an SOP writer and not a template marketplace.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-welcome-pack",
    keyword: "Client Welcome Pack",
    heading: "Client welcome pack after handoff, not after the signature",
    description:
      "Client Systems generates a copyable welcome draft when sales-to-delivery handoff completes — kickoff, success metric, leads, access deadline. Not a Notion welcome page sent too early.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.85,
    index: true,
    lede: "A welcome pack sent the hour the contract is signed, before delivery has accepted the job, is a promise delivery did not make. Client Systems writes the welcome draft when handoff is Complete.",
    sections: [
      {
        heading: "What the draft contains",
        body: [
          "Engagement name, client owner, kickoff date, success metric, end state, account lead, delivery lead, primary channel, and when outstanding access is due. v1 shows a copyable draft. It does not pretend to send email for you.",
          "Copy it into the channel you locked at kickoff. Keep the source of truth in Client Systems.",
        ],
      },
      {
        heading: "On the path after yes",
        body: [
          "Proposal facts first. Welcome when delivery accepts. Then the onboarding checklist. Writer is for drafting SOPs; this pack is for the client relationship.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-intake-form",
    keyword: "Client Intake Form",
    heading: "Client intake form: the record after yes",
    description:
      "The Client Systems intake form becomes the client record after yes — identity, outcomes, brand kit, access, commercial facts. Not a Typeform that never reaches delivery.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.9,
    index: true,
    lede: "Intake is not a survey. It is the client record you run after yes. Client Systems walks identity, people, outcomes, scope, access, and engagement so handoff has something true to accept.",
    sections: [
      {
        heading: "What gets captured",
        body: [
          "Client name, legal name, website, industry, size, owner, day-to-day and billing contacts, timezone, hours, end state, success metric, failure definition, deadlines, tools, constraints, must-haves, out of scope, third parties, brand-kit status (Yes / No / Later), analytics, prior creative, compliance, channel, feedback SLA, change approver, PO, invoice email, payment terms, contract status, and risks.",
          "Brand kit Yes requires a URL. Brand kit Later sets a pending SLA three days after kickoff.",
        ],
      },
      {
        heading: "Where the form lives",
        body: [
          "Fill it in the workspace at /app/projects/new — not in a Notion database you duplicate per client. Start free, then run intake there.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/sales-to-delivery-handoff",
    keyword: "Sales to Delivery Handoff",
    heading: "Sales-to-delivery handoff is the gate after yes",
    description:
      "Sales-to-delivery handoff in Client Systems: both account lead and delivery lead confirm before the onboarding board seeds and the welcome draft appears.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.9,
    index: true,
    lede: "After yes, sales does not get to throw the job over a wall. Client Systems requires the account lead to complete handoff and delivery to accept. Only then do the 31 tasks and the welcome draft exist.",
    sections: [
      {
        heading: "What both leads confirm",
        body: [
          "Proposal link, contract link, commercial notes, payment notes, scope promises from the sale, kickoff agenda notes, and three risks. If delivery will not accept, the board stays empty. That is the point.",
          "Complete seeds Blueprint A tasks and writes a copyable welcome draft. Optional Slack webhook can post. v1 does not send client email.",
        ],
      },
      {
        heading: "What this is not",
        body: [
          "It is not an SOP in Writer. It is not a ClickUp handoff task you check without delivery. It is the gate on the client path: proposal facts in, welcome and onboarding out.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/client-systems-kit",
    keyword: "Client Systems Kit",
    heading: "Client Systems Kit — $39 blueprint, workspace to run it",
    description:
      "The Client Systems Kit is $39. Start free in the Client Systems workspace to run proposal → welcome → onboard. Not a Notion kit. Not SOP Writer.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.9,
    index: true,
    lede: "The kit is $39. The workspace is where you run it after yes. This page does not invent a SaaS seat plan. Start free in Client Systems; get the kit when you want the packaged blueprint.",
    sections: [
      {
        heading: "What $39 is",
        body: [
          "Thirty-nine dollars is the Client Systems Kit — the SOP Mojo blueprint for client onboarding systems. Checkout may live on a separate URL when Sales publishes it. Until then the Get the $39 Kit control is a placeholder. We do not invent coupons or seat-count slogans.",
        ],
      },
      {
        heading: "What you start free",
        body: [
          "clients.sopmojo.com is the workspace: signup, invite teammates, intake, handoff, board, access SLAs. That is the product you operate. The kit is the packaged operating design. They are related; they are not the same SKU.",
        ],
      },
      {
        heading: "What this kit is not",
        body: [
          "It is not AI SOP Writer. It is not a Notion or ClickUp template pack. Writer drafts procedures. Builder Pro keeps them alive. This kit and workspace are the client path after yes.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/how-it-works",
    keyword: "How Client Systems Works",
    heading: "How Client Systems works after yes",
    description:
      "How SOP Mojo Client Systems works: start free, intake after yes, dual-confirm sales-to-delivery handoff, seeded board, access SLAs.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.8,
    index: true,
    lede: "Four gates on the client path. The board does not exist until delivery accepts the job.",
    sections: [
      {
        heading: "1. Start free in a workspace",
        body: [
          "Create an account at clients.sopmojo.com. One workspace per buyer. Invite teammates by email list.",
        ],
      },
      {
        heading: "2. Intake the engagement",
        body: [
          "New project is a wizard: client, people, outcomes, scope, access, engagement. Brand kit Later creates a three-day post-kickoff SLA instead of a pretend Yes.",
        ],
      },
      {
        heading: "3. Sales-to-delivery handoff",
        body: [
          "Account lead and delivery lead both confirm. That seeds the 31 tasks and writes a welcome draft you can copy.",
        ],
      },
      {
        heading: "4. Run the board and access",
        body: [
          "Move tasks. Overdue Later access creates an escalation for the account lead. Optional Slack webhook. This is still not SOP Writer.",
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
      "FAQ for SOP Mojo Client Systems: after-yes client path, not SOP Writer, not Notion or ClickUp, kit $39, Writer and Builder Pro bridges.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Short answers. Client Systems is the path after yes. The kit is $39. The board seeds after handoff. Writer and Builder Pro stay on their hosts.",
    faqs: [
      ...SHARED_FAQS,
      {
        question: "When does the onboarding board appear?",
        answer:
          "When sales-to-delivery handoff is Complete — account lead and delivery lead have both confirmed. Then 31 Blueprint A tasks seed across four columns.",
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
  "/client-onboarding",
  "/client-onboarding-checklist",
  "/client-proposal-template",
  "/client-welcome-pack",
  "/client-intake-form",
  "/sales-to-delivery-handoff",
  "/client-systems-kit",
  "/how-it-works",
  "/faq",
] as const;

export const PHASE_TWO_PATHS = [
  "/meeting-agenda",
  "/raci",
  "/handbook",
  "/pricing",
  "/agency-client-onboarding",
] as const;
