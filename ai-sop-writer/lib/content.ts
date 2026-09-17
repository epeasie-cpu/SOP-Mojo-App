import type { SopInput } from "./sop";

export type ContentType = "home" | "page" | "use-case" | "utility";

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
  slug?: string;
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
  prefill?: Partial<SopInput>;
};

const LASTMOD = "2026-09-17";

const SHARED_FAQS: FaqItem[] = [
  {
    question: "What does SOP mean here?",
    answer:
      "SOP means standard operating procedure — the written way a job gets done. It does not mean statement of purpose. AI SOP Writer drafts procedures your team can review, not admissions essays.",
  },
  {
    question: "Is this the same product as SOP Builder Pro?",
    answer:
      "No. AI SOP Writer produces a first-draft procedure. SOP Builder Pro is the living system — ownership, revision control, training, and floor-ready access. Generate a draft here on writer.sopmojo.com, then graduate it to Builder Pro. The living system runs at builder.sopmojo.com.",
  },
  {
    question: "Do I need an AI API key?",
    answer:
      "No. If an OpenAI or Anthropic key is configured, the writer uses a language model. If not, it uses a deterministic template engine and labels the result as template mode. Either way you get purpose, owner, trigger, tools, KPI, steps, exceptions, a checklist, and safety notes.",
  },
];

export const CONTENT: ContentEntry[] = [
  {
    path: "/",
    keyword: "Write a Standard Operating Procedure",
    heading: "Write a first-draft SOP in minutes",
    description:
      "AI SOP Writer drafts a standard operating procedure from your process, role, and outcome. Review it with the owner, then move it into SOP Builder Pro.",
    type: "home",
    parent: null,
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 1,
    index: true,
    lede: "Describe the job. Get a first-draft standard operating procedure with purpose, owner, trigger, tools, KPI, steps, exceptions, a checklist, and safety notes — then review it with the person who actually does the work.",
    sections: [
      {
        heading: "A draft is not a living system",
        body: [
          "Most teams do not fail because they lack another blank template. They fail because the real procedure still lives in someone’s head. AI SOP Writer exists to pull that knowledge onto the page so you can stop retraining the same steps from memory.",
          "The draft is a starting point, not a policy carved in stone. The banner on every output says it plainly: review with the process owner before you train anyone. After that review, the procedure belongs in a system that can be owned, measured, and updated — SOP Builder Pro.",
        ],
      },
      {
        heading: "What every draft includes",
        body: [
          "Purpose states why the procedure exists and what “done well” looks like. Owner names the role accountable for the work. Trigger describes the event that starts the job. Tools lists the systems and equipment the role actually uses. KPI ties the procedure to an outcome you can inspect.",
          "Steps are numbered actions, not slogans. Exceptions cover the usual stalls, defects, and handoffs. The checklist is the close-out a supervisor can audit. Safety notes flag the foreseeable harm for that kind of work — chemicals, job sites, customer data, or simple over-trust in an unreviewed draft.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/how-it-works",
    keyword: "How AI SOP Writer Works",
    heading: "How AI SOP Writer works",
    description:
      "Describe a process, generate a first-draft SOP, review it with the owner, and move the living version into SOP Builder Pro.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.8,
    index: true,
    lede: "Four moves take tribal knowledge from a hallway explanation to a procedure you can actually review.",
    sections: [
      {
        heading: "1. Describe the process, not the novel",
        body: [
          "You provide business type, process name, and the role that owns the work. Tools, outcome or KPI, and trigger are optional but they make the draft sharper. You do not need a perfect brief. You need the name of the job and who is on the hook for it.",
        ],
      },
      {
        heading: "2. Generate a first draft",
        body: [
          "If an API key is present, a language model writes the procedure. If not, a deterministic template engine assembles one and labels template mode. The structure does not change: purpose, owner, trigger, tools, KPI, steps, exceptions, checklist, safety notes.",
        ],
      },
      {
        heading: "3. Review with the process owner",
        body: [
          "Print it, copy it, or download Markdown or print-ready HTML. Sit with the person who does the work. Correct the shortcuts the draft invented. Add the exception that only they remember. Do not train a team on an unreviewed first draft.",
        ],
      },
      {
        heading: "4. Put the approved version in a living system",
        body: [
          "A Markdown file in a folder will rot. SOP Builder Pro is the SOP Mojo product for ownership, KPI linkage, revision control, and frontline access. AI SOP Writer gets you the first page. Builder Pro keeps the procedure true after the business changes.",
        ],
      },
    ],
    howTo: {
      name: "How to generate a first-draft SOP with AI SOP Writer",
      description:
        "Turn a process name and owning role into a reviewable standard operating procedure, then graduate it to SOP Builder Pro.",
      steps: [
        {
          name: "Describe the process",
          text: "Enter business type, process name, and the owning role. Add tools, a KPI, and a trigger if you have them.",
        },
        {
          name: "Generate the draft",
          text: "Submit the form. AI SOP Writer returns a structured SOP. If no language-model key is configured, it uses the template engine and labels template mode.",
        },
        {
          name: "Review with the process owner",
          text: "Copy, print, or download the draft. Confirm steps, exceptions, and safety notes with the person who does the work before anyone is trained.",
        },
        {
          name: "Move it into SOP Builder Pro",
          text: "Take the approved procedure into SOP Builder Pro so it can live as an owned, measurable, revisable operating asset. The living system is at builder.sopmojo.com.",
        },
      ],
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/ai-sop-generator",
    keyword: "AI SOP Generator",
    heading: "AI SOP generator for standard operating procedures",
    description:
      "Use AI SOP Writer as an AI SOP generator: turn a process and role into a first-draft standard operating procedure you can copy, print, or download.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 0.9,
    index: true,
    lede: "This page is the generator surface for AI SOP Writer — the SOP Mojo product that writes a first-draft standard operating procedure. The product name is AI SOP Writer, not SOP Generator.",
    sections: [
      {
        heading: "What the generator asks for",
        body: [
          "Business type tells the draft which world it is in — a trade crew, a housekeeping team, a sales desk, a professional firm. Process name is the job to document. Role is the owner, not a committee. Optional tools, KPI, and trigger keep the output from sounding like a generic memo.",
        ],
      },
      {
        heading: "What you should not expect",
        body: [
          "The generator will not certify you for an audit, invent OSHA citations, or replace a walkthrough with the people who do the work. It will not manage revisions, training videos, or QR-linked floor charters. That is SOP Builder Pro. Use this generator to get a draft on the page today.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is AI SOP Writer an AI SOP generator?",
        answer:
          "Yes. AI SOP Writer is the product. Generating a first-draft SOP is the job. Other tools may call themselves SOP generators; this product’s name in the UI is AI SOP Writer.",
      },
      ...SHARED_FAQS,
    ],
  },
  {
    path: "/sop-template",
    keyword: "SOP Template",
    heading: "SOP template: the nine sections a first draft needs",
    description:
      "Use this SOP template structure — purpose, owner, trigger, tools, KPI, steps, exceptions, checklist, and safety notes — then generate a filled first draft.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.8,
    index: true,
    lede: "A usable SOP template is a skeleton with an owner and an outcome, not a 40-page policy binder. AI SOP Writer fills this skeleton from your process.",
    sections: [
      {
        heading: "Purpose",
        body: [
          "One or two sentences: why this procedure exists and what result it protects. If you cannot name the result, you do not have a procedure yet — you have a task list.",
        ],
      },
      {
        heading: "Owner",
        body: [
          "A role with a human being behind it. “The team” is not an owner. When the procedure drifts, this is who is asked to update it.",
        ],
      },
      {
        heading: "Trigger",
        body: [
          "The event that starts the work: a signed proposal, a room checkout, a work order, a new-hire start date. Without a trigger, people guess when the SOP applies.",
        ],
      },
      {
        heading: "Tools",
        body: [
          "The systems, forms, and equipment the role actually uses. Naming tools prevents the draft from assuming a stack you do not have.",
        ],
      },
      {
        heading: "KPI",
        body: [
          "A measurable outcome: cycle time, defect rate, show-up rate, close rate, inspection pass rate. The KPI is how a manager knows the procedure is working.",
        ],
      },
      {
        heading: "Steps, exceptions, checklist, safety notes",
        body: [
          "Steps are numbered, observable actions. Exceptions are the stalls you already know will happen. The checklist is the close-out. Safety notes are the foreseeable harm — not a dump of every regulation on the internet.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/how-to-write-an-sop",
    keyword: "How to Write an SOP",
    heading: "How to write an SOP that people will actually follow",
    description:
      "How to write a standard operating procedure: name the outcome, assign an owner, define the trigger, write observable steps, then review it on the floor.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.9,
    index: true,
    lede: "Writing an SOP is not literature. It is transferring a job from one person’s memory to a page the next person can run without a Slack thread.",
    sections: [
      {
        heading: "Write for the person doing the work",
        body: [
          "If the only person who understands the document is the founder, it is not an SOP. Use the language of the role. Name the screens they click, the tools they pick up, and the person they call when the happy path breaks.",
        ],
      },
      {
        heading: "Prefer observable steps over values statements",
        body: [
          "“Provide excellent service” is not a step. “Greet the guest, confirm the work order number, and photograph the site before starting” is a step. AI SOP Writer is biased toward the second kind of sentence.",
        ],
      },
      {
        heading: "Pair every procedure with an exception path",
        body: [
          "Real work leaves the script. Missing parts, a no-show client, a wet floor, a CRM field that does not exist — if you do not write the exception, the team will invent one. Invented exceptions are how quality quietly dies.",
        ],
      },
      {
        heading: "Then stop treating the file as finished",
        body: [
          "A first draft from AI SOP Writer is the beginning of maintenance, not the end of documentation. After the owner reviews it, move the approved version into SOP Builder Pro so revisions, training, and access do not depend on whoever still has the Google Doc.",
        ],
      },
    ],
    howTo: {
      name: "How to write a standard operating procedure",
      description:
        "A practical method for writing an SOP that names an owner, a trigger, a KPI, and steps a frontline role can follow.",
      steps: [
        {
          name: "Name the process and the outcome",
          text: "Give the job a plain-language name and state the result you will inspect (speed, quality, safety, revenue, or completion).",
        },
        {
          name: "Assign a human owner",
          text: "Pick the role accountable for executing and updating the procedure. Avoid “the team” as an owner.",
        },
        {
          name: "Define the trigger",
          text: "Write the event that starts the work so people know when this SOP applies and when it does not.",
        },
        {
          name: "List tools and write observable steps",
          text: "Name the systems and equipment, then write numbered actions a new person could follow without a side conversation.",
        },
        {
          name: "Document exceptions, a checklist, and safety notes",
          text: "Capture stalls, a close-out checklist a supervisor can audit, and the foreseeable harm for this kind of work.",
        },
        {
          name: "Review with the person who does the job",
          text: "Walk the draft on the floor or desk. Correct invented steps. Do not train from an unreviewed draft.",
        },
        {
          name: "Place the approved SOP in a living system",
          text: "Move the reviewed procedure into SOP Builder Pro so ownership, KPI, and revisions stay current.",
        },
      ],
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/faq",
    keyword: "AI SOP Writer FAQ",
    heading: "AI SOP Writer frequently asked questions",
    description:
      "FAQ for AI SOP Writer: what an SOP is, how drafts are generated, how this differs from SOP Builder Pro, and how to contact SOP Mojo.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Short answers about first-draft standard operating procedures, AI vs template mode, and where SOP Builder Pro fits.",
    faqs: [
      ...SHARED_FAQS,
      {
        question: "Who is AI SOP Writer for?",
        answer:
          "Operators, managers, and founders of small and mid-sized businesses who need a first-draft procedure for a real job — client onboarding, sales, employee onboarding, housekeeping, trades, or any process that currently lives in someone’s head.",
      },
      {
        question: "Can I copy, print, or download the draft?",
        answer:
          "Yes. You can copy the Markdown, print the page, download a .md file, or download print-ready HTML. Optional email capture is local only; no email service provider is required.",
      },
      {
        question: "Is the output original?",
        answer:
          "Yes. AI SOP Writer is an original SOP Mojo product. It does not paste third-party SOP packs or Scribd documents. Drafts are assembled from your inputs plus the writer’s own procedure structure.",
      },
      {
        question: "Where do I get help?",
        answer:
          "Email ryan@sopmojo.com. For the parent company, visit www.sopmojo.com. For downloadable SOP Mojo products, visit www.sopmojo.com/soplibrary. For SOP Builder Pro, visit www.sopmojo.com/lp/ai-sop-writer. The living SOP system is at builder.sopmojo.com.",
      },
      {
        question: "Will you train my team on the draft?",
        answer:
          "Not from this product. AI SOP Writer writes the first draft. You review it with the process owner. SOP Mojo’s services and SOP Builder Pro cover implementation and the living system.",
      },
    ],
  },
  {
    path: "/vs/sop-builder-pro",
    keyword: "AI SOP Writer vs SOP Builder Pro",
    heading: "AI SOP Writer vs SOP Builder Pro",
    description:
      "AI SOP Writer drafts a standard operating procedure. SOP Builder Pro is the living system for ownership, KPIs, training, and revision control.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.8,
    index: true,
    lede: "Same family. Different jobs. Use AI SOP Writer to get a first draft on the page. Use SOP Builder Pro when the procedure has to run the business.",
    sections: [
      {
        heading: "What AI SOP Writer is for",
        body: [
          "You need a procedure out of someone’s head today. You can name the business, the process, and the owning role. You want purpose, trigger, tools, KPI, steps, exceptions, a checklist, and safety notes you can copy or print. You are willing to review the draft before anyone is trained.",
        ],
      },
      {
        heading: "What SOP Builder Pro is for",
        body: [
          "The draft is not enough. You need a living library: a human owner, a KPI that stays attached, revisions when the work changes, and a way for people on the floor to find the current version instead of asking the founder. That is SOP Builder Pro — developed by Ryan Pease, founder of SOP Mojo. The living system runs at builder.sopmojo.com.",
        ],
      },
      {
        heading: "A sensible sequence",
        body: [
          "Generate here. Review with the owner. Then build the living version in SOP Builder Pro. If you already know you need the operating system, skip ahead to Builder Pro and use this writer only when you want a faster first page.",
        ],
      },
    ],
    faqs: SHARED_FAQS,
  },
  {
    path: "/use-cases",
    keyword: "SOP Use Cases",
    heading: "SOP use cases",
    description:
      "First-draft SOP use cases for client onboarding, sales, employee onboarding, housekeeping, trades, and process documentation.",
    type: "page",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 0.7,
    index: true,
    lede: "Pick the job that is currently trapped in someone’s head. Each use case includes a generator prefill so you can produce a first-draft standard operating procedure immediately.",
  },
  {
    path: "/use-cases/client-onboarding",
    slug: "client-onboarding",
    keyword: "Client Onboarding SOP",
    heading: "Client onboarding SOP",
    description:
      "Draft a client onboarding standard operating procedure: kickoff, access, first deliverable, and the handoff off the founder’s calendar.",
    type: "use-case",
    parent: "/use-cases",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Client onboarding fails in the gaps: the contract is signed, then nobody owns the first 14 days. A client onboarding SOP names the kickoff trigger, the workspace, the first deliverable, and who calls when a login never arrives.",
    sections: [
      {
        heading: "What this SOP should make obvious",
        body: [
          "When onboarding starts, which role owns the kickoff, which tools hold the client record, and what “onboarded” means as a KPI — time-to-first-value, kickoff held within X days, or access provisioned before day two.",
        ],
      },
      {
        heading: "Exceptions worth writing down",
        body: [
          "The buyer is not the day-to-day contact. A stakeholder no-shows the kickoff. A tool license is delayed. Scope in the proposal does not match the kickoff notes. Those are not surprises; they are the job.",
        ],
      },
    ],
    prefill: {
      businessType: "Professional services firm",
      processName: "New client onboarding",
      role: "Client onboarding lead",
      tools: "CRM, project workspace, billing, video meetings",
      kpi: "Kickoff held and workspace live within 5 business days of signature",
      trigger: "Signed agreement received and matter opened in the CRM",
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/use-cases/sales",
    slug: "sales",
    keyword: "Sales SOP",
    heading: "Sales SOP",
    description:
      "Draft a sales standard operating procedure for discovery, proposal, CRM hygiene, and a close path that does not live in one rep’s inbox.",
    type: "use-case",
    parent: "/use-cases",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "A sales SOP is not a motivational poster. It is the repeatable path from a qualified conversation to a clean handoff — with CRM fields filled in while the deal is still true.",
    sections: [
      {
        heading: "What this SOP should make obvious",
        body: [
          "Stage definitions, required notes after discovery, who can issue pricing, and the KPI (win rate, cycle time, or complete CRM records). The trigger is usually a qualified lead or a booked discovery call — not “whenever someone has time.”",
        ],
      },
      {
        heading: "Exceptions worth writing down",
        body: [
          "A champion goes dark. Legal requests a redline. The buyer asks for work that is not on the rate card. Discount authority is unclear. Write those paths or every deal becomes a founder rescue.",
        ],
      },
    ],
    prefill: {
      businessType: "B2B services company",
      processName: "Qualified opportunity to signed proposal",
      role: "Account executive",
      tools: "CRM, calendar, proposal tool, email",
      kpi: "Proposal sent within 48 hours of a completed discovery call",
      trigger: "Opportunity marked qualified in the CRM",
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/use-cases/employee-onboarding",
    slug: "employee-onboarding",
    keyword: "Employee Onboarding SOP",
    heading: "Employee onboarding SOP",
    description:
      "Draft an employee onboarding standard operating procedure for day one access, role ramp, and a 30-day checklist that is not a scavenger hunt.",
    type: "use-case",
    parent: "/use-cases",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Employee onboarding is a process with a start date, an owner, and a definition of “ready to work.” If those three are missing, you have a welcome lunch and a pile of unanswered questions.",
    sections: [
      {
        heading: "What this SOP should make obvious",
        body: [
          "Who provisions accounts before day one, which role runs orientation, which SOPs the new hire must be walked through, and the 30-day KPI (time-to-first-solo-task, equipment ready on day one, or manager check-ins completed).",
        ],
      },
      {
        heading: "Exceptions worth writing down",
        body: [
          "Laptop delay. Background check pending. Hiring manager on PTO. Remote start with no camera. Write the backup owner or day one becomes an apology tour.",
        ],
      },
    ],
    prefill: {
      businessType: "Small operating company",
      processName: "New employee onboarding (day 1 to day 30)",
      role: "People operations lead",
      tools: "HRIS, email, chat, equipment tracker, SOP library",
      kpi: "Day-one access complete and 30-day ramp checklist at 100%",
      trigger: "Signed offer and confirmed start date",
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/use-cases/housekeeping",
    slug: "housekeeping",
    keyword: "Housekeeping SOP",
    heading: "Housekeeping SOP",
    description:
      "Draft a housekeeping standard operating procedure for room or site turnover, inspection, chemicals, and a pass-fail close-out.",
    type: "use-case",
    parent: "/use-cases",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Housekeeping quality is visible in minutes and forgotten in none. A housekeeping SOP sequences the room or site, names the chemicals, and puts inspection on a checklist instead of a vibe.",
    sections: [
      {
        heading: "What this SOP should make obvious",
        body: [
          "The trigger (checkout, shift start, or work order), the path through the space, linen or supply counts, inspection owner, and the KPI (inspection pass rate, turnover time, or guest-ready by a clock time).",
        ],
      },
      {
        heading: "Safety is part of the procedure",
        body: [
          "Wet floors, chemical mixing, sharps, biohazard, and unused PPE are not footnotes. The draft includes safety notes so a reviewer can tighten them to the actual SDS and site rules. Do not train from the draft until that review happens.",
        ],
      },
    ],
    prefill: {
      businessType: "Hospitality / facilities",
      processName: "Guest room turnover",
      role: "Housekeeping supervisor",
      tools: "Cart, chemical caddy, checklist, radio, PMS room status",
      kpi: "Inspection pass rate above 95% and rooms guest-ready by 3 p.m.",
      trigger: "Room status changes to vacant-dirty",
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/use-cases/trades",
    slug: "trades",
    keyword: "Trades SOP",
    heading: "Trades SOP",
    description:
      "Draft a trades standard operating procedure for job-site arrival, permit-to-work, execution, punch list, and a safe close-out.",
    type: "use-case",
    parent: "/use-cases",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Trades work is already a procedure — it is just usually stored in the lead’s head. A trades SOP captures arrival, site hazards, the job sequence, the punch list, and who signs the close-out.",
    sections: [
      {
        heading: "What this SOP should make obvious",
        body: [
          "The work-order trigger, PPE and site check, customer walkthrough, isolation or lockout if it applies, photo or test records, and the KPI (callback rate, on-time finish, or first-time fix).",
        ],
      },
      {
        heading: "Write the site, not the slogan",
        body: [
          "“Be safe” is not a step. “Confirm isolation, photograph the nameplate, and test before restore” is a step. Review every trades draft with the person who runs the site before you hand it to an apprentice.",
        ],
      },
    ],
    prefill: {
      businessType: "Residential and light-commercial trades",
      processName: "On-site service job from arrival to close-out",
      role: "Lead technician",
      tools: "Work-order app, meter, PPE, van stock, customer sign-off form",
      kpi: "First-time fix rate and same-day close-out photos in the job file",
      trigger: "Dispatched work order with customer window confirmed",
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/use-cases/process-documentation",
    slug: "process-documentation",
    keyword: "Process Documentation SOP",
    heading: "Process documentation SOP",
    description:
      "Draft a process documentation standard operating procedure for capturing tribal knowledge from a SME without another abandoned wiki.",
    type: "use-case",
    parent: "/use-cases",
    lastmod: LASTMOD,
    changefreq: "monthly",
    priority: 0.7,
    index: true,
    lede: "Process documentation is itself a process. If you do not SOP how you capture work, you get scattered notes and a wiki nobody trusts. This use case documents how your team documents.",
    sections: [
      {
        heading: "What this SOP should make obvious",
        body: [
          "Who interviews the subject-matter expert, how a process is selected (pain, risk, or revenue), which template is used — the nine-section skeleton in AI SOP Writer — and the KPI (procedures reviewed per month, or percent of critical jobs with an owner).",
        ],
      },
      {
        heading: "Close the loop into a living system",
        body: [
          "A captured draft that stays in a downloads folder is still tribal knowledge, just in a new format. After the SME reviews it, the approved SOP belongs in SOP Builder Pro, not in a personal drive.",
        ],
      },
    ],
    prefill: {
      businessType: "Growing operations team",
      processName: "Capture and publish a process from a subject-matter expert",
      role: "Operations coordinator",
      tools: "AI SOP Writer, interview notes, SOP Builder Pro, shared calendar",
      kpi: "SME-reviewed SOP published within 10 business days of the interview",
      trigger: "A critical job is flagged as founder- or specialist-dependent",
    },
    faqs: SHARED_FAQS,
  },
  {
    path: "/sitemap",
    keyword: "HTML Sitemap",
    heading: "Sitemap",
    description:
      "HTML sitemap for AI SOP Writer: every crawlable page on writer.sopmojo.com.",
    type: "utility",
    parent: "/",
    lastmod: LASTMOD,
    changefreq: "weekly",
    priority: 0.3,
    index: true,
  },
  {
    path: "/search",
    keyword: "Search AI SOP Writer",
    heading: "Search",
    description: "Search AI SOP Writer pages and SOP use cases.",
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

export function findEntry(path: string): ContentEntry | undefined {
  return byPath.get(path);
}

export function pagesForSitemap(): ContentEntry[] {
  return CONTENT.filter((entry) => entry.index && entry.type !== "use-case");
}

export function getUseCaseSitemapEntries(): ContentEntry[] {
  return CONTENT.filter((entry) => entry.index && entry.type === "use-case");
}

export function indexedContent(): ContentEntry[] {
  return CONTENT.filter((entry) => entry.index);
}

export function getUseCaseEntries(): ContentEntry[] {
  return CONTENT.filter((entry) => entry.type === "use-case");
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
      ...(entry.sections ?? []).flatMap((section) => [
        section.heading,
        ...section.body,
      ]),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
