import { addUtcDays, brandKitSlaDeadline } from "./seed-tasks";

export type AccessStatus = "YES" | "NO" | "LATER";

export type AccessSeedInput = {
  itemName: string;
  canProvide: AccessStatus | string | null | undefined;
  url?: string | null;
  notes?: string | null;
  laterOffsetDays: number;
};

export function normalizeAccessStatus(value: string | null | undefined): AccessStatus {
  const upper = (value ?? "LATER").toUpperCase();
  if (upper === "YES" || upper === "NO" || upper === "LATER") return upper;
  return "LATER";
}

export function buildDefaultAccessSeeds(input: {
  kickoffDate: Date | null;
  accessDeadlineDay: number;
  brandKitStatus: string;
  brandKitUrl?: string | null;
  analyticsAccessStatus?: string | null;
  priorCreativeStatus?: string | null;
  currentTools?: string | null;
}): AccessSeedInput[] {
  const defaultOffset = input.accessDeadlineDay > 0 ? input.accessDeadlineDay : 5;
  const brandStatus = normalizeAccessStatus(input.brandKitStatus);
  const analyticsStatus = normalizeAccessStatus(input.analyticsAccessStatus);
  const creativeStatus = normalizeAccessStatus(input.priorCreativeStatus);

  return [
    {
      itemName: "Brand kit",
      canProvide: brandStatus,
      url: brandStatus === "YES" ? input.brandKitUrl : null,
      notes:
        brandStatus === "LATER"
          ? "Pending. SLA is 3 days after kickoff."
          : brandStatus === "NO"
            ? "Client cannot provide a brand kit."
            : null,
      laterOffsetDays: brandStatus === "LATER" ? 3 : defaultOffset,
    },
    {
      itemName: "Analytics / tracking access",
      canProvide: analyticsStatus,
      notes: analyticsStatus === "LATER" ? "Pending until access deadline." : null,
      laterOffsetDays: defaultOffset,
    },
    {
      itemName: "Prior creative / assets",
      canProvide: creativeStatus,
      notes: creativeStatus === "LATER" ? "Pending until access deadline." : null,
      laterOffsetDays: defaultOffset,
    },
    {
      itemName: "Current tools / logins",
      canProvide: input.currentTools?.trim() ? "YES" : "LATER",
      notes: input.currentTools?.trim() || "List tools the client already uses.",
      laterOffsetDays: defaultOffset,
    },
  ];
}

export function slaDeadlineForAccessItem(input: {
  kickoffDate: Date | null;
  canProvide: string;
  itemName: string;
  laterOffsetDays: number;
  brandKitStatus?: string;
}): Date | null {
  const status = normalizeAccessStatus(input.canProvide);
  if (status !== "LATER") return null;
  if (input.itemName === "Brand kit") {
    return brandKitSlaDeadline(input.kickoffDate, input.brandKitStatus ?? "LATER");
  }
  if (!input.kickoffDate) return null;
  return addUtcDays(input.kickoffDate, input.laterOffsetDays);
}
