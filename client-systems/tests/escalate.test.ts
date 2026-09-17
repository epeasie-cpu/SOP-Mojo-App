import { buildEscalationTask, isAccessOverdue, selectOverdueAccessItems } from "@/lib/escalate";
import { describe, expect, it } from "vitest";

const now = new Date("2026-09-20T18:00:00.000Z");

describe("access SLA escalation", () => {
  it("creates a blocked AccountLead task for overdue Later items", () => {
    const item = {
      id: "a1",
      itemName: "Brand kit",
      canProvide: "LATER",
      slaDeadline: new Date("2026-09-20T17:00:00.000Z"),
      receivedAt: null,
      escalationSent: false,
    };
    expect(isAccessOverdue(item, now)).toBe(true);
    expect(buildEscalationTask(item)).toMatchObject({
      title: "Escalate: Brand kit access overdue",
      status: "BLOCKED",
      ownerRole: "AccountLead",
      boardColumn: "WEEK_1",
    });
  });

  it("skips received, NO, already escalated, or future SLA items", () => {
    const items = [
      {
        id: "1",
        itemName: "Analytics",
        canProvide: "LATER",
        slaDeadline: new Date("2026-09-21T17:00:00.000Z"),
        receivedAt: null,
        escalationSent: false,
      },
      {
        id: "2",
        itemName: "CMS",
        canProvide: "NO",
        slaDeadline: new Date("2026-09-01T17:00:00.000Z"),
        receivedAt: null,
        escalationSent: false,
      },
      {
        id: "3",
        itemName: "Ads",
        canProvide: "LATER",
        slaDeadline: new Date("2026-09-01T17:00:00.000Z"),
        receivedAt: new Date("2026-09-02T00:00:00.000Z"),
        escalationSent: false,
      },
      {
        id: "4",
        itemName: "Brand kit",
        canProvide: "LATER",
        slaDeadline: new Date("2026-09-01T17:00:00.000Z"),
        receivedAt: null,
        escalationSent: true,
      },
    ];
    expect(selectOverdueAccessItems(items, now)).toEqual([]);
  });
});
