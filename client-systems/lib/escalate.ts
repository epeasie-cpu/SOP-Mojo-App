export type EscalatableAccessItem = {
  id: string;
  itemName: string;
  canProvide: string;
  slaDeadline: Date | null;
  receivedAt: Date | null;
  escalationSent: boolean;
};

export type EscalationTaskDraft = {
  title: string;
  boardColumn: "PRE_KICKOFF" | "WEEK_1";
  status: "BLOCKED";
  ownerRole: "AccountLead";
  sourceSection: "blueprint-b:access-sla";
};

export function isAccessOverdue(
  item: EscalatableAccessItem,
  now: Date = new Date(),
): boolean {
  if (item.receivedAt) return false;
  if (item.canProvide === "NO") return false;
  if (item.escalationSent) return false;
  if (!item.slaDeadline) return false;
  if (item.canProvide !== "LATER" && item.canProvide !== "YES") {
    return item.slaDeadline.getTime() < now.getTime();
  }
  if (item.canProvide === "YES" && !item.receivedAt) {
    return item.slaDeadline.getTime() < now.getTime();
  }
  return item.canProvide === "LATER" && item.slaDeadline.getTime() < now.getTime();
}

export function buildEscalationTask(item: EscalatableAccessItem): EscalationTaskDraft {
  return {
    title: `Escalate: ${item.itemName} overdue`,
    boardColumn: "WEEK_1",
    status: "BLOCKED",
    ownerRole: "AccountLead",
    sourceSection: "blueprint-b:access-sla",
  };
}

export function selectOverdueAccessItems(
  items: EscalatableAccessItem[],
  now: Date = new Date(),
): EscalatableAccessItem[] {
  return items.filter((item) => isAccessOverdue(item, now));
}
