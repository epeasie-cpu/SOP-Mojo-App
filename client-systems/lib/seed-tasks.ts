export const BOARD_COLUMNS = [
  "PRE_KICKOFF",
  "KICKOFF_DAY",
  "WEEK_1",
  "STABILIZE",
] as const;

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export const TASK_STATUSES = ["TODO", "DOING", "BLOCKED", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const OWNER_ROLES = ["AccountLead", "DeliveryLead", "BillingOwner"] as const;
export type OwnerRole = (typeof OWNER_ROLES)[number];

export type SeedTaskDefinition = {
  title: string;
  boardColumn: BoardColumn;
  ownerRole: OwnerRole;
  dueRule: string;
  sortOrder: number;
  sourceSection: string;
};

export const SEED_TASK_COUNTS: Record<BoardColumn, number> = {
  PRE_KICKOFF: 10,
  KICKOFF_DAY: 7,
  WEEK_1: 8,
  STABILIZE: 6,
};

export const BLUEPRINT_A_SOURCE = "blueprint-a";

/**
 * Client Systems Kit Blueprint A — 31 onboarding tasks across 4 board columns.
 * Titles live in repo source so the app does not depend on kit box paths.
 */
export const BLUEPRINT_A_TASKS: SeedTaskDefinition[] = [
  {
    title: "File the signed contract and deal identifiers",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "AccountLead",
    dueRule: "kickoff-5",
    sortOrder: 1,
    sourceSection: "pre-kickoff.commercial",
  },
  {
    title: "Send first invoice and confirm payment terms",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "BillingOwner",
    dueRule: "kickoff-5",
    sortOrder: 2,
    sourceSection: "pre-kickoff.commercial",
  },
  {
    title: "Create the client record from intake in Client Systems",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "AccountLead",
    dueRule: "kickoff-4",
    sortOrder: 3,
    sourceSection: "pre-kickoff.intake",
  },
  {
    title: "Stand up the delivery workspace and file structure",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff-4",
    sortOrder: 4,
    sourceSection: "pre-kickoff.setup",
  },
  {
    title: "Send the access request list to the day-to-day contact",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "AccountLead",
    dueRule: "kickoff-3",
    sortOrder: 5,
    sourceSection: "pre-kickoff.access",
  },
  {
    title: "Send the welcome packet and kickoff agenda",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "AccountLead",
    dueRule: "kickoff-3",
    sortOrder: 6,
    sourceSection: "pre-kickoff.welcome",
  },
  {
    title: "Confirm kickoff attendees, timezone, and channel",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "AccountLead",
    dueRule: "kickoff-2",
    sortOrder: 7,
    sourceSection: "pre-kickoff.kickoff-logistics",
  },
  {
    title: "Run internal delivery briefing from the sales handoff",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff-2",
    sortOrder: 8,
    sourceSection: "pre-kickoff.internal",
  },
  {
    title: "Reconfirm in-scope, out-of-scope, and hard nos with delivery",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff-1",
    sortOrder: 9,
    sourceSection: "pre-kickoff.scope",
  },
  {
    title: "Set brand-kit SLA (3 days post kickoff if Later)",
    boardColumn: "PRE_KICKOFF",
    ownerRole: "AccountLead",
    dueRule: "kickoff-1",
    sortOrder: 10,
    sourceSection: "pre-kickoff.brand",
  },
  {
    title: "Run kickoff: end state, success metric, failure definition",
    boardColumn: "KICKOFF_DAY",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+0",
    sortOrder: 11,
    sourceSection: "kickoff.outcomes",
  },
  {
    title: "Lock communication channel, meeting cadence, and feedback SLA",
    boardColumn: "KICKOFF_DAY",
    ownerRole: "AccountLead",
    dueRule: "kickoff+0",
    sortOrder: 12,
    sourceSection: "kickoff.comms",
  },
  {
    title: "Confirm change approver and decision SLA",
    boardColumn: "KICKOFF_DAY",
    ownerRole: "AccountLead",
    dueRule: "kickoff+0",
    sortOrder: 13,
    sourceSection: "kickoff.decisions",
  },
  {
    title: "Walk the access list; log gaps the same day",
    boardColumn: "KICKOFF_DAY",
    ownerRole: "AccountLead",
    dueRule: "kickoff+0",
    sortOrder: 14,
    sourceSection: "kickoff.access",
  },
  {
    title: "Confirm milestone 1 name, format, and due date",
    boardColumn: "KICKOFF_DAY",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+0",
    sortOrder: 15,
    sourceSection: "kickoff.milestones",
  },
  {
    title: "Send kickoff recap within 24 hours",
    boardColumn: "KICKOFF_DAY",
    ownerRole: "AccountLead",
    dueRule: "kickoff+1",
    sortOrder: 16,
    sourceSection: "kickoff.recap",
  },
  {
    title: "Open the decision log with owners and due dates",
    boardColumn: "KICKOFF_DAY",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+0",
    sortOrder: 17,
    sourceSection: "kickoff.decisions",
  },
  {
    title: "Chase overdue access daily until received or waived",
    boardColumn: "WEEK_1",
    ownerRole: "AccountLead",
    dueRule: "kickoff+1",
    sortOrder: 18,
    sourceSection: "week-1.access",
  },
  {
    title: "Deliver the first working artifact against milestone 1",
    boardColumn: "WEEK_1",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+3",
    sortOrder: 19,
    sourceSection: "week-1.delivery",
  },
  {
    title: "Collect client feedback against the stated SLA",
    boardColumn: "WEEK_1",
    ownerRole: "AccountLead",
    dueRule: "kickoff+4",
    sortOrder: 20,
    sourceSection: "week-1.feedback",
  },
  {
    title: "Log every blocker with owner, next action, and due date",
    boardColumn: "WEEK_1",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+2",
    sortOrder: 21,
    sourceSection: "week-1.blockers",
  },
  {
    title: "Confirm analytics/measurement baseline if in scope",
    boardColumn: "WEEK_1",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+5",
    sortOrder: 22,
    sourceSection: "week-1.measurement",
  },
  {
    title: "Align third parties named in intake",
    boardColumn: "WEEK_1",
    ownerRole: "AccountLead",
    dueRule: "kickoff+5",
    sortOrder: 23,
    sourceSection: "week-1.vendors",
  },
  {
    title: "Run the week-1 checkpoint against the success metric",
    boardColumn: "WEEK_1",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+7",
    sortOrder: 24,
    sourceSection: "week-1.checkpoint",
  },
  {
    title: "Notify the client of any SLA miss the same day",
    boardColumn: "WEEK_1",
    ownerRole: "AccountLead",
    dueRule: "kickoff+7",
    sortOrder: 25,
    sourceSection: "week-1.sla",
  },
  {
    title: "Close remaining access gaps or record a formal waiver",
    boardColumn: "STABILIZE",
    ownerRole: "AccountLead",
    dueRule: "kickoff+10",
    sortOrder: 26,
    sourceSection: "stabilize.access",
  },
  {
    title: "Confirm the cadence runs without the founder",
    boardColumn: "STABILIZE",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+14",
    sortOrder: 27,
    sourceSection: "stabilize.cadence",
  },
  {
    title: "Checkpoint success metric and secondary outcomes",
    boardColumn: "STABILIZE",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+14",
    sortOrder: 28,
    sourceSection: "stabilize.metric",
  },
  {
    title: "Capture operating notes for SOP Builder Pro",
    boardColumn: "STABILIZE",
    ownerRole: "DeliveryLead",
    dueRule: "kickoff+16",
    sortOrder: 29,
    sourceSection: "stabilize.sops",
  },
  {
    title: "Reconfirm PO, invoice email, and payment terms",
    boardColumn: "STABILIZE",
    ownerRole: "BillingOwner",
    dueRule: "kickoff+18",
    sortOrder: 30,
    sourceSection: "stabilize.commercial",
  },
  {
    title: "Mark onboarding complete and move to steady state",
    boardColumn: "STABILIZE",
    ownerRole: "AccountLead",
    dueRule: "kickoff+21",
    sortOrder: 31,
    sourceSection: "stabilize.close",
  },
];

export function countSeedTasksByColumn(
  tasks: SeedTaskDefinition[] = BLUEPRINT_A_TASKS,
): Record<BoardColumn, number> {
  return BOARD_COLUMNS.reduce(
    (acc, column) => {
      acc[column] = tasks.filter((task) => task.boardColumn === column).length;
      return acc;
    },
    { PRE_KICKOFF: 0, KICKOFF_DAY: 0, WEEK_1: 0, STABILIZE: 0 },
  );
}

export function parseDueRule(dueRule: string, kickoffDate: Date): Date {
  const match = dueRule.match(/^(kickoff|handoff)([+-]\d+)$/);
  if (!match) return new Date(kickoffDate);
  const offset = Number(match[2]);
  const due = new Date(kickoffDate);
  due.setUTCDate(due.getUTCDate() + offset);
  due.setUTCHours(17, 0, 0, 0);
  return due;
}

export function emailForOwnerRole(
  role: OwnerRole,
  leads: {
    accountLeadEmail?: string | null;
    deliveryLeadEmail?: string | null;
    billingOwnerEmail?: string | null;
  },
): string | null {
  if (role === "AccountLead") return leads.accountLeadEmail ?? null;
  if (role === "DeliveryLead") return leads.deliveryLeadEmail ?? null;
  return leads.billingOwnerEmail ?? null;
}

export function buildSeededTaskRows(input: {
  kickoffDate: Date | null;
  accountLeadEmail?: string | null;
  deliveryLeadEmail?: string | null;
  billingOwnerEmail?: string | null;
  tasks?: SeedTaskDefinition[];
}) {
  const kickoff = input.kickoffDate ?? new Date();
  const defs = input.tasks ?? BLUEPRINT_A_TASKS;
  return defs.map((task) => ({
    title: task.title,
    boardColumn: task.boardColumn,
    status: "TODO" as TaskStatus,
    ownerRole: task.ownerRole,
    ownerEmail: emailForOwnerRole(task.ownerRole, input),
    dueDate: parseDueRule(task.dueRule, kickoff),
    dueRule: task.dueRule,
    sortOrder: task.sortOrder,
    sourceSection: `${BLUEPRINT_A_SOURCE}:${task.sourceSection}`,
    completedAt: null as Date | null,
  }));
}

export const BRAND_KIT_LATER_SLA_DAYS = 3;

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  next.setUTCHours(17, 0, 0, 0);
  return next;
}

export function brandKitSlaDeadline(
  kickoffDate: Date | null | undefined,
  brandKitStatus: string,
  laterOffsetDays = BRAND_KIT_LATER_SLA_DAYS,
): Date | null {
  if (brandKitStatus !== "LATER") return null;
  if (!kickoffDate) return null;
  return addUtcDays(kickoffDate, laterOffsetDays);
}
