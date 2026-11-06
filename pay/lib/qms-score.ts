/**
 * Quality System Fit Check. Pure and rule-based.
 *
 * Category, in order:
 * 1. Regulated or audited → C, compliance-grade QMS. Documented SOPs stay the foundation.
 * 2. Else field or on-site inspections → B, field inspection app.
 * 3. Else → A, simple SOP and checklist system.
 * Team size and the main pain do not change the category.
 *
 * Process documentation score is the sum of five answers. Max 100.
 * written 25, home 20, review 20, corrective 20, training 15.
 * The result lists up to three answers with the most points left, ties broken
 * by written, home, review, corrective, training.
 */

export const QMS_DOC_POINTS = {
  written: { none: 0, few: 8, most: 18, all: 25 },
  home: { heads: 0, scattered: 6, shared: 14, system: 20 },
  review: { no: 0, sometimes: 10, yes: 20 },
  corrective: { none: 0, sheet: 10, system: 20 },
  training: { shadow: 0, once: 5, written: 10, record: 15 },
} as const;

export const QMS_GAP_ORDER = ["written", "home", "review", "corrective", "training"] as const;

export type QmsGapId = (typeof QMS_GAP_ORDER)[number];

export type QmsAnswers = {
  team: "solo" | "small" | "mid" | "large";
  regulated: "yes" | "no";
  field: "yes" | "no";
  written: keyof typeof QMS_DOC_POINTS.written;
  home: keyof typeof QMS_DOC_POINTS.home;
  review: keyof typeof QMS_DOC_POINTS.review;
  corrective: keyof typeof QMS_DOC_POINTS.corrective;
  training: keyof typeof QMS_DOC_POINTS.training;
  pain: "inconsistency" | "rework" | "founder" | "audit";
};

export type QmsCategory = "A" | "B" | "C";

export type QmsGap = {
  id: QmsGapId;
  title: string;
  detail: string;
  missed: number;
};

export type QmsResult = {
  category: QmsCategory;
  categoryTitle: string;
  summary: string;
  nextStep: "builder_pro" | "compliance_qms";
  score: number;
  gaps: QmsGap[];
};

export type QmsQuestion = {
  id: keyof QmsAnswers;
  prompt: string;
  options: { id: string; label: string }[];
};

export const QMS_QUESTIONS: QmsQuestion[] = [
  {
    id: "team",
    prompt: "How big is the team that does this work?",
    options: [
      { id: "solo", label: "Just me" },
      { id: "small", label: "2–10 people" },
      { id: "mid", label: "11–74 people" },
      { id: "large", label: "75 or more" },
    ],
  },
  {
    id: "regulated",
    prompt: "Does a regulator, customer, or auditor require a quality system?",
    options: [
      { id: "yes", label: "Yes. ISO 9001, FDA, medical devices, food safety, or a similar audit." },
      { id: "no", label: "No. We are not in a regulated or audited industry." },
    ],
  },
  {
    id: "field",
    prompt: "Do people run inspections or checks away from a desk?",
    options: [
      { id: "yes", label: "Yes. Field or on-site teams inspect or record work on location." },
      { id: "no", label: "No. The work stays at a desk, bench, or shop." },
    ],
  },
  {
    id: "written",
    prompt: "How many of your core processes are written down?",
    options: [
      { id: "none", label: "Almost none" },
      { id: "few", label: "A few" },
      { id: "most", label: "Most" },
      { id: "all", label: "Nearly all" },
    ],
  },
  {
    id: "home",
    prompt: "Where do SOPs live today?",
    options: [
      { id: "heads", label: "In people's heads" },
      { id: "scattered", label: "In email, chat, or scattered files" },
      { id: "shared", label: "In one shared folder or wiki" },
      { id: "system", label: "In a system built to hold procedures" },
    ],
  },
  {
    id: "review",
    prompt: "Is there a version or review process for those documents?",
    options: [
      { id: "no", label: "No" },
      { id: "sometimes", label: "Sometimes, but it is not consistent" },
      { id: "yes", label: "Yes. Documents have an owner and a review" },
    ],
  },
  {
    id: "corrective",
    prompt: "How are nonconformances and corrective actions tracked?",
    options: [
      { id: "none", label: "They are not tracked" },
      { id: "sheet", label: "In a spreadsheet, inbox, or chat" },
      { id: "system", label: "In a system, with an owner and a due date" },
    ],
  },
  {
    id: "training",
    prompt: "How do people learn the work?",
    options: [
      { id: "shadow", label: "They shadow someone" },
      { id: "once", label: "A one-time walkthrough or slide deck" },
      { id: "written", label: "A written process, with no record of who was trained" },
      { id: "record", label: "A written process, plus a record of who was trained" },
    ],
  },
  {
    id: "pain",
    prompt: "What is the main pain right now?",
    options: [
      { id: "inconsistency", label: "Work comes out differently depending on who does it" },
      { id: "rework", label: "Errors and rework" },
      { id: "founder", label: "The founder is the bottleneck" },
      { id: "audit", label: "Getting ready for an audit or a customer review" },
    ],
  },
];

const GAP_COPY: Record<QmsGapId, { title: string; detail: string }> = {
  written: {
    title: "Core processes are not written down",
    detail: "The steps live with whoever does the work. A new person cannot follow them from a page.",
  },
  home: {
    title: "SOPs do not have one home",
    detail: "People cannot tell which file is the current way to do the work.",
  },
  review: {
    title: "Documents have no consistent version or review",
    detail: "Nothing names an owner or a time to check that the written steps still match the work.",
  },
  corrective: {
    title: "Nonconformances and corrective actions are not tracked in one place",
    detail: "When something goes wrong, the fix has no owner and no record that it closed.",
  },
  training: {
    title: "Training has no written process or no record",
    detail: "People learn by watching, and there is no note of who was shown the current SOP.",
  },
};

const PAIN_LABEL: Record<QmsAnswers["pain"], string> = {
  inconsistency: "inconsistent work",
  rework: "errors and rework",
  founder: "the founder bottleneck",
  audit: "audit prep",
};

function optionIds(id: keyof QmsAnswers): Set<string> {
  const question = QMS_QUESTIONS.find((item) => item.id === id);
  return new Set(question?.options.map((option) => option.id) ?? []);
}

export function parseQmsAnswers(value: Record<string, unknown>): QmsAnswers | null {
  const answers = {} as QmsAnswers;
  for (const question of QMS_QUESTIONS) {
    const raw = value[question.id];
    if (typeof raw !== "string" || !optionIds(question.id).has(raw)) return null;
    (answers[question.id] as string) = raw;
  }
  return answers;
}

function pointsFor(answers: QmsAnswers, id: QmsGapId): number {
  const table = QMS_DOC_POINTS[id] as Record<string, number>;
  return table[answers[id]] ?? 0;
}

function maxPoints(id: QmsGapId): number {
  return Math.max(...Object.values(QMS_DOC_POINTS[id]));
}

export function qmsDocumentationScore(answers: QmsAnswers): number {
  return QMS_GAP_ORDER.reduce((sum, id) => sum + pointsFor(answers, id), 0);
}

export function qmsGaps(answers: QmsAnswers): QmsGap[] {
  return QMS_GAP_ORDER.map((id) => ({
    id,
    ...GAP_COPY[id],
    missed: maxPoints(id) - pointsFor(answers, id),
  }))
    .filter((gap) => gap.missed > 0)
    .sort((a, b) => b.missed - a.missed || QMS_GAP_ORDER.indexOf(a.id) - QMS_GAP_ORDER.indexOf(b.id))
    .slice(0, 3);
}

/** Heading matches the number of gaps on screen and in the email. */
export function qmsGapHeading(count: number): string | null {
  if (count === 1) return "Your biggest gap";
  if (count > 1) return "Your biggest gaps";
  return null;
}

function categorySummary(answers: QmsAnswers, category: QmsCategory): string {
  if (category === "C") {
    const field = answers.field === "yes" ? " Field inspections still need a checklist and a record of what was found." : "";
    return `A compliance-grade quality management system fits this check. Regulated or audited work needs controlled documents, records, and a way to track corrective actions. Documented SOPs are still the foundation. This check does not recommend a vendor.${field}`;
  }
  if (category === "B") {
    return "A field inspection app fits the on-site checks in this result. Pair it with written SOPs so the checklist matches how the work is done.";
  }
  return "A simple SOP and checklist system fits this check. Start by writing the work down and using a checklist.";
}

export function scoreQms(answers: QmsAnswers): QmsResult {
  const category: QmsCategory = answers.regulated === "yes" ? "C" : answers.field === "yes" ? "B" : "A";
  const categoryTitle =
    category === "C" ? "Compliance-grade QMS" : category === "B" ? "Field inspection app" : "Simple SOP and checklist system";
  return {
    category,
    categoryTitle,
    summary: categorySummary(answers, category),
    nextStep: category === "C" ? "compliance_qms" : "builder_pro",
    score: qmsDocumentationScore(answers),
    gaps: qmsGaps(answers),
  };
}

export type QmsPlanStep = { label: string; text: string };

export function qmsActionPlan(answers: QmsAnswers, result: QmsResult): QmsPlanStep[] {
  const pain = PAIN_LABEL[answers.pain];
  const firstGap = result.gaps[0]?.title ?? "one core process";
  const solo =
    answers.team === "solo" ? " Write the steps as if someone else will run them next month." : "";
  const week3 =
    result.category === "C"
      ? "Add an owner and a review to the SOP, and write down how a nonconformance is recorded and who closes it. A compliance-grade QMS needs those records. Documented SOPs are still the foundation."
      : result.category === "B"
        ? "Turn the on-site inspection into a checklist someone can complete in the field, including what to record when a check fails."
        : "Turn the SOP into a checklist and run it on the next real job. Note where the checklist and the work disagree.";
  return [
    {
      label: "Days 1–7",
      text: `You named the main pain as ${pain}. Write the process behind this gap: ${firstGap}.${solo}`,
    },
    {
      label: "Days 8–14",
      text: "Put that SOP in one place the team can open. If procedures live in email, chat, or people's heads, move this process to that one home.",
    },
    { label: "Days 15–21", text: week3 },
    {
      label: "Days 22–30",
      text: "Have one other person follow the SOP, or follow it yourself on a live job if you work alone. Note who was trained and the date. Set the next review so the document does not sit unchanged.",
    },
  ];
}
