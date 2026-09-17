import { brandKitSlaDeadline, BRAND_KIT_LATER_SLA_DAYS, parseDueRule } from "@/lib/seed-tasks";
import { describe, expect, it } from "vitest";

describe("brand kit Later SLA", () => {
  it("sets a 3-day post-kickoff deadline when status is LATER", () => {
    const kickoff = new Date("2026-09-17T00:00:00.000Z");
    const sla = brandKitSlaDeadline(kickoff, "LATER");
    expect(sla).not.toBeNull();
    expect(sla?.toISOString().slice(0, 10)).toBe("2026-09-20");
    expect(BRAND_KIT_LATER_SLA_DAYS).toBe(3);
  });

  it("does not set an SLA when brand kit is YES or NO", () => {
    const kickoff = new Date("2026-09-17T00:00:00.000Z");
    expect(brandKitSlaDeadline(kickoff, "YES")).toBeNull();
    expect(brandKitSlaDeadline(kickoff, "NO")).toBeNull();
  });
});

describe("due rules", () => {
  it("offsets from kickoff in UTC days", () => {
    const kickoff = new Date("2026-09-17T00:00:00.000Z");
    expect(parseDueRule("kickoff+0", kickoff).toISOString().slice(0, 10)).toBe("2026-09-17");
    expect(parseDueRule("kickoff-2", kickoff).toISOString().slice(0, 10)).toBe("2026-09-15");
    expect(parseDueRule("kickoff+7", kickoff).toISOString().slice(0, 10)).toBe("2026-09-24");
  });
});
