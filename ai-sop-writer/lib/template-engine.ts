import type { SopDraft, SopInput, SopStep } from "./sop";

function clean(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function splitTools(tools: string): string[] {
  return tools
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function haystack(input: SopInput): string {
  return `${input.businessType} ${input.processName} ${input.role}`.toLowerCase();
}

function numbered(titles: Array<[string, string]>): SopStep[] {
  return titles.map(([title, detail], index) => ({
    number: index + 1,
    title,
    detail,
  }));
}

function defaultTools(input: SopInput): string {
  const hay = haystack(input);
  if (/(housekeep|hotel|clean|janitor)/.test(hay)) {
    return "Cart, chemical caddy, checklist, radio, property system";
  }
  if (/(trade|hvac|plumb|electric|job site|technician)/.test(hay)) {
    return "Work-order app, PPE, meters, van stock, customer sign-off";
  }
  if (/(sales|pipeline|proposal|crm)/.test(hay)) {
    return "CRM, calendar, proposal tool, email";
  }
  if (/(onboard|hr|employee|hiring)/.test(hay)) {
    return "HRIS, email, chat, equipment tracker, SOP library";
  }
  return "Shared inbox, workspace, checklist, calendar";
}

function defaultKpi(input: SopInput): string {
  const hay = haystack(input);
  if (hay.includes("sales")) {
    return "Complete CRM record and proposal sent within the agreed cycle time";
  }
  if (hay.includes("onboard")) {
    return "Time-to-ready (kickoff complete or day-one access complete)";
  }
  if (/(housekeep|clean)/.test(hay)) {
    return "Inspection pass rate and on-time guest- or occupant-ready status";
  }
  if (/(trade|technician|job)/.test(hay)) {
    return "First-time fix rate and same-day close-out documentation";
  }
  return `On-time, complete ${input.processName} with exceptions logged`;
}

function defaultTrigger(input: SopInput): string {
  return `When ${input.role} is assigned “${input.processName}” for this ${input.businessType}.`;
}

function stepsFor(input: SopInput): SopStep[] {
  const hay = haystack(input);
  const role = input.role;
  const process = input.processName;
  const tools = clean(input.tools, defaultTools(input));

  if (/(client|customer).*(onboard)|onboard.*(client|customer)/.test(hay)) {
    return numbered([
      [
        "Confirm the commercial trigger",
        `${role} verifies the signed agreement, start date, and primary contact in the system of record before any kickoff message is sent.`,
      ],
      [
        "Open the client workspace",
        `Create the project or matter, grant access only to named people, and record tool logins in ${tools}.`,
      ],
      [
        "Send the kickoff pack",
        `Issue agenda, what we need from the client, and the first 14-day plan. Time-box unanswered items.`,
      ],
      [
        "Run the kickoff",
        "Walk scope, success metrics, communication cadence, and the first deliverable. Capture decisions in the workspace the same day.",
      ],
      [
        "Provision remaining access",
        "Close any login gaps the same business day or log an exception with an owner and due date.",
      ],
      [
        "Hand off internally",
        `Brief the delivery owner on decisions, risks, and the KPI for “${process}.” The onboarding role does not retain silent ownership.`,
      ],
      [
        "Close onboarding",
        "Mark the CRM or tracker complete only when kickoff is held, workspace is live, and the first deliverable date is accepted.",
      ],
    ]);
  }

  if (/(employee|new hire|people ops|hr )/.test(hay) && /onboard/.test(hay)) {
    return numbered([
      [
        "Confirm start date and role",
        `${role} verifies the signed offer, manager, location, and equipment needs before day one.`,
      ],
      [
        "Provision access",
        `Create accounts, badge, and hardware using ${tools}. Do not wait until the employee is in the building to start this.`,
      ],
      [
        "Issue the ramp plan",
        `Send the 30-day checklist, the SOPs they must be walked through, and the name of their buddy or trainer.`,
      ],
      [
        "Run day-one orientation",
        "Cover safety, how to find procedures, who to escalate to, and the first supervised task.",
      ],
      [
        "Complete week-one check-in",
        "Manager confirms the new hire can find tools, has done one real task, and has no blocked access.",
      ],
      [
        "Close the 30-day ramp",
        `Score the checklist. Any open item becomes a dated exception. “${process}” is not complete while critical access is missing.`,
      ],
    ]);
  }

  if (/(sales|proposal|pipeline|opportunity)/.test(hay)) {
    return numbered([
      [
        "Qualify the trigger",
        `${role} confirms the opportunity meets the entry criteria and logs the source in the CRM.`,
      ],
      [
        "Prepare discovery",
        `Pull account history, prior proposals, and the current offer. Tools: ${tools}.`,
      ],
      [
        "Run discovery",
        "Capture problem, decision process, timeline, and success metric. Write notes in the CRM before the next meeting is booked.",
      ],
      [
        "Draft the proposal",
        `Use approved language and pricing. If the ask is off-menu, stop and escalate — do not invent a package in the thread.`,
      ],
      [
        "Internal review",
        "Get the required approval for discount or scope before the customer sees the document.",
      ],
      [
        "Send and track",
        "Issue the proposal, set the next event on the calendar, and update stage and KPI fields the same day.",
      ],
      [
        "Handoff or recycle",
        `On win, trigger delivery onboarding. On loss or stall, record the reason. ${process} does not end in an inbox.`,
      ],
    ]);
  }

  if (/(housekeep|room turnover|clean|janitor)/.test(hay)) {
    return numbered([
      [
        "Take the assignment",
        `${role} confirms the room or zone status and loads the cart to the standard par.`,
      ],
      [
        "Stage and protect the space",
        "Place wet-floor or work-in-progress signs. Check for occupied status before entering.",
      ],
      [
        "Strip and reset",
        `Follow the sequence for ${process}: trash, linen, surfaces, bathroom, floor. Do not skip inspection points to save minutes.`,
      ],
      [
        "Handle chemicals correctly",
        "Use labeled bottles only. Never mix products. Restock from the caddy standard, not from unmarked containers.",
      ],
      [
        "Self-inspect",
        "Run the close-out checklist. Photograph or tag exceptions (damage, missing assets, biohazard) before leaving.",
      ],
      [
        "Update status",
        "Mark the space ready only after the checklist passes. Notify the desk or supervisor of blocked rooms.",
      ],
    ]);
  }

  if (/(trade|technician|hvac|plumb|electric|job site|field service)/.test(hay)) {
    return numbered([
      [
        "Confirm dispatch",
        `${role} reviews the work order, customer window, and known site hazards before rolling.`,
      ],
      [
        "Arrive and control the site",
        "Park safely, don PPE, announce arrival, and walk the customer through the planned work.",
      ],
      [
        "Test and isolate",
        "Photograph nameplates or existing conditions. Isolate energy sources if the job requires it. Do not start a live guess.",
      ],
      [
        "Execute the job",
        `Perform ${process} against the work order. Record parts used and any deviation immediately.`,
      ],
      [
        "Verify and restore",
        "Test the result, restore what was isolated, and show the customer the outcome.",
      ],
      [
        "Punch and close",
        `Capture close-out photos, customer sign-off, and leftover work in ${tools}. Same-day file complete is part of the job.`,
      ],
    ]);
  }

  if (/(document|sme|tribal|knowledge|process capture)/.test(hay)) {
    return numbered([
      [
        "Select the job worth capturing",
        `${role} picks a process that is founder-dependent, high-risk, or high-volume — not the easiest meeting to schedule.`,
      ],
      [
        "Interview the SME",
        "Watch or walk the work. Ask for trigger, tools, exceptions, and what “good” looks like. Record notes the same day.",
      ],
      [
        "Generate the first draft",
        "Run AI SOP Writer with business type, process name, role, tools, KPI, and trigger filled from the interview.",
      ],
      [
        "Review on the floor or desk",
        "Sit with the SME. Delete invented steps. Add the exception only they know. Do not publish yet.",
      ],
      [
        "Publish into the living system",
        "Move the approved SOP into SOP Builder Pro with an owner and review date. A downloads folder is not publication.",
      ],
      [
        "Schedule the first revision",
        `Set a review date. ${process} is incomplete until the next human checkpoint exists.`,
      ],
    ]);
  }

  return numbered([
    [
      "Confirm the trigger applies",
      `${role} checks that this instance of “${process}” matches the trigger and is not a look-alike job.`,
    ],
    [
      "Gather inputs and tools",
      `Collect the record, materials, and access listed for this ${input.businessType}. Tools: ${tools}.`,
    ],
    [
      "Prepare the workspace",
      "Remove stale versions, confirm permissions, and brief anyone receiving a handoff.",
    ],
    [
      "Execute the core work",
      `Complete ${process} in the sequence this role already uses when the day goes well. Write deviations as you go.`,
    ],
    [
      "Record the outcome against the KPI",
      "Update the tracker or file so a manager can see whether the outcome was met without asking in chat.",
    ],
    [
      "Handle exceptions or escalate",
      `If the happy path breaks, follow the exception list. Do not invent a private workaround for ${process}.`,
    ],
    [
      "Close and notify",
      "Run the checklist, notify the next role if any, and mark the job complete only when the checklist passes.",
    ],
  ]);
}

function exceptionsFor(input: SopInput): string[] {
  const hay = haystack(input);
  const common = [
    `Required information or access is missing — ${input.role} logs the gap, names an owner, and does not mark the job complete.`,
    "The person who normally does the work is unavailable — a named backup role is used, or the job is rescheduled on the record.",
    "The live process disagrees with this draft — stop training, capture the difference, and update the SOP with the process owner.",
  ];
  if (/(sales|proposal)/.test(hay)) {
    return [
      "Discount or scope sits outside the rate card — escalate before sending.",
      "Champion goes silent past the follow-up SLA — recycle or re-qualify in the CRM.",
      ...common,
    ];
  }
  if (/(housekeep|clean)/.test(hay)) {
    return [
      "Room or zone is still occupied — do not enter; return it to the board.",
      "Biohazard, sharps, or damage found — stop, isolate, and notify the supervisor.",
      ...common,
    ];
  }
  if (/(trade|technician|job site)/.test(hay)) {
    return [
      "Site conditions are unsafe or isolation cannot be confirmed — do not start.",
      "Parts are not on the van — record the delay and the customer impact before leaving.",
      ...common,
    ];
  }
  return common;
}

function checklistFor(input: SopInput): string[] {
  return [
    `Trigger for “${input.processName}” was valid and recorded.`,
    `${input.role} is named as owner on the record for this instance.`,
    "Tools and access were available, or exceptions were logged.",
    "Every step was completed or explicitly skipped with a reason.",
    "KPI evidence was captured (timestamp, photo, CRM field, or sign-off).",
    "Exceptions were closed or owned with a due date.",
    "Process owner has not been asked to train anyone on an unreviewed first draft.",
  ];
}

function safetyFor(input: SopInput): string[] {
  const hay = haystack(input);
  const always = [
    "This is a first draft. Do not train staff, contractors, or customers on it until the process owner reviews it.",
    "Do not invent legal, medical, or regulatory citations. If a permit, SDS, or code applies, attach the real document your company already uses.",
  ];
  if (/(housekeep|clean|chemical)/.test(hay)) {
    return [
      ...always,
      "Treat unlabeled bottles as unusable. Do not mix chemicals. Use PPE required by the product label and site rules.",
      "Control wet floors and sharps. Report biohazard through the supervisor path, not a side chat.",
    ];
  }
  if (/(trade|technician|job site|hvac|electric|plumb)/.test(hay)) {
    return [
      ...always,
      "PPE, isolation, and site control come before tools-out. If you cannot confirm a safe condition, stop.",
      "Live electrical, pressurized systems, and heights require the site’s existing permit-to-work practice — this draft does not replace it.",
    ];
  }
  if (/(sales|crm|client|customer)/.test(hay)) {
    return [
      ...always,
      "Do not paste confidential client data into unapproved tools. Prefer the company’s designated systems.",
      "Do not promise work, pricing, or timelines that are not on an approved offer.",
    ];
  }
  return [
    ...always,
    "Protect personal and customer data. Use only approved systems for files and credentials.",
    "If the work has physical, chemical, or privacy risk not covered here, add it during owner review before anyone is trained.",
  ];
}

export function generateTemplateSop(input: SopInput): SopDraft {
  const businessType = clean(input.businessType, "small business");
  const processName = clean(input.processName, "named process");
  const role = clean(input.role, "process owner");
  const normalized: SopInput = {
    businessType,
    processName,
    role,
    tools: input.tools,
    kpi: input.kpi,
    trigger: input.trigger,
  };
  const tools = splitTools(clean(normalized.tools, defaultTools(normalized)));
  const kpi = clean(normalized.kpi, defaultKpi(normalized));
  const trigger = clean(normalized.trigger, defaultTrigger(normalized));

  return {
    title: `${processName} — standard operating procedure`,
    purpose: `This standard operating procedure describes how ${role} completes “${processName}” for a ${businessType} so the team can deliver a consistent result and inspect it against the KPI: ${kpi}.`,
    owner: role,
    trigger,
    tools,
    kpi,
    steps: stepsFor(normalized),
    exceptions: exceptionsFor(normalized),
    checklist: checklistFor(normalized),
    safetyNotes: safetyFor(normalized),
  };
}

export function validateInput(body: unknown): { input: SopInput } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be an object." };
  }
  const record = body as Record<string, unknown>;
  const businessType = typeof record.businessType === "string" ? record.businessType.trim() : "";
  const processName = typeof record.processName === "string" ? record.processName.trim() : "";
  const role = typeof record.role === "string" ? record.role.trim() : "";
  if (!businessType || !processName || !role) {
    return { error: "Business type, process name, and role are required." };
  }
  const optional = (key: string) =>
    typeof record[key] === "string" ? (record[key] as string).trim() : undefined;
  return {
    input: {
      businessType,
      processName,
      role,
      tools: optional("tools"),
      kpi: optional("kpi"),
      trigger: optional("trigger"),
    },
  };
}
