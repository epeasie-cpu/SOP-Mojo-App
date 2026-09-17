import { BOARD_COLUMNS, BLUEPRINT_A_TASKS, countSeedTasksByColumn, SEED_TASK_COUNTS } from "@/lib/seed-tasks";
import { describe, expect, it } from "vitest";

describe("seed-tasks Blueprint A", () => {
  it("creates 31 tasks across the four board columns", () => {
    expect(BLUEPRINT_A_TASKS).toHaveLength(31);
    expect(countSeedTasksByColumn()).toEqual(SEED_TASK_COUNTS);
    expect(SEED_TASK_COUNTS.PRE_KICKOFF + SEED_TASK_COUNTS.KICKOFF_DAY + SEED_TASK_COUNTS.WEEK_1 + SEED_TASK_COUNTS.STABILIZE).toBe(31);
  });

  it("uses the expected column set and unique sort order", () => {
    const columns = [...new Set(BLUEPRINT_A_TASKS.map((task) => task.boardColumn))];
    expect(columns.sort()).toEqual([...BOARD_COLUMNS].sort());
    const orders = BLUEPRINT_A_TASKS.map((task) => task.sortOrder);
    expect(new Set(orders).size).toBe(31);
  });

  it("assigns an owner role and due rule to every task", () => {
    for (const task of BLUEPRINT_A_TASKS) {
      expect(task.title.length).toBeGreaterThan(8);
      expect(task.ownerRole).toMatch(/AccountLead|DeliveryLead|BillingOwner/);
      expect(task.dueRule).toMatch(/^(kickoff|handoff)[+-]\d+$/);
    }
  });
});
