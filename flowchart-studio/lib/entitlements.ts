/**
 * Shared entitlement contract for Flowchart Studio and Builder Pro.
 *
 * Source of truth: `public.entitlements` on the shared Builder Supabase project.
 * See `supabase/migrations/20260925_entitlements.sql` and `ENTITLEMENTS.md`.
 *
 * Print and file export (PNG / JSON / handoff) are allowed when
 * `flowchart_plus OR builder_pro`. Export to Builder / attach is allowed
 * only when `builder_pro`.
 *
 * `flowchart-studio-unlocked` localStorage is not a production gate.
 * Studio clears it. `?unlock=` is honored only when the server env
 * `FLOWCHART_QA_UNLOCK` is on.
 */

export const ENTITLEMENTS_TABLE = "entitlements";

export const ENTITLEMENT_CONTRACT = {
  schema: "public",
  table: ENTITLEMENTS_TABLE,
  columns: {
    userId: "user_id",
    email: "email",
    flowchartPlus: "flowchart_plus",
    builderPro: "builder_pro",
    updatedAt: "updated_at",
  },
  printExport: "flowchart_plus OR builder_pro",
  exportToBuilder: "builder_pro",
} as const;

/** @deprecated Honor-system key. Production gates ignore it. Cleared on load. */
export const UNLOCK_STORAGE_KEY = "flowchart-studio-unlocked";
/** @deprecated Honor-system key. Production gates ignore it. Cleared on load. */
export const UNLOCK_SOURCE_KEY = "flowchart-studio-unlock-source";

export const PREMIUM_ACTIONS = ["print", "export", "send"] as const;
export type PremiumAction = (typeof PREMIUM_ACTIONS)[number];

export type EntitlementFlags = {
  flowchart_plus: boolean;
  builder_pro: boolean;
};

export type EntitlementSource = "none" | "account" | "qa";

export type EntitlementSnapshot = EntitlementFlags & {
  source: EntitlementSource;
};

export const LOCKED_ENTITLEMENTS: EntitlementFlags = {
  flowchart_plus: false,
  builder_pro: false,
};

export const UNLOCK_COPY = {
  headline: "Unlock print and export",
  sendHeadline: "Export to Builder Pro",
  lockedLabel: "Print and export are locked",
  flowchartPlus: "Flowchart Plus $19",
  flowchartPlusNote: "Print and export only",
  builder: "Builder Pro $39/mo includes print, export, and Export to Builder Pro",
  summary:
    "Free covers create and iterate. Flowchart Plus ($19 one-time) unlocks Print and Export. Builder Pro ($39/mo) includes those and Export to Builder Pro.",
  print: "Print is included with Flowchart Plus or Builder Pro.",
  export: "Export (PNG / JSON) is included with Flowchart Plus or Builder Pro.",
  send: "Export to Builder Pro requires Builder Pro. Flowchart Plus does not include it.",
} as const;

export function canPrintExport(flags: EntitlementFlags): boolean {
  return flags.flowchart_plus === true || flags.builder_pro === true;
}

export function canExportToBuilder(flags: EntitlementFlags): boolean {
  return flags.builder_pro === true;
}

export function allowsPremium(flags: EntitlementFlags, action: PremiumAction): boolean {
  if (action === "send") return canExportToBuilder(flags);
  return canPrintExport(flags);
}

export function gateLabel(action: PremiumAction): string {
  if (action === "print") return UNLOCK_COPY.print;
  if (action === "export") return UNLOCK_COPY.export;
  return UNLOCK_COPY.send;
}

/**
 * Ryan QA query values. Ignored unless `FLOWCHART_QA_UNLOCK` is enabled
 * on the server. Does not write localStorage.
 *
 * - `1` / `flowchart-plus` / `standalone`: print + export only
 * - `builder-pro`: Export to Builder as well (Builder includes print + export)
 */
export function qaUnlockFromQuery(value: string | null | undefined): EntitlementFlags | null {
  if (value == null) return null;
  const token = value.trim().toLowerCase();
  if (!token) return null;
  if (token === "builder-pro" || token === "builder_pro" || token === "builder") {
    return { flowchart_plus: false, builder_pro: true };
  }
  if (
    token === "1" ||
    token === "true" ||
    token === "yes" ||
    token === "standalone" ||
    token === "flowchart-plus" ||
    token === "flowchart_plus" ||
    token === "flowchart-studio"
  ) {
    return { flowchart_plus: true, builder_pro: false };
  }
  return null;
}

export function qaUnlockEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.FLOWCHART_QA_UNLOCK?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function resolveEntitlements(
  account: EntitlementFlags,
  queryUnlock: string | null | undefined,
  qaEnabled: boolean,
): EntitlementSnapshot {
  const qa = qaEnabled ? qaUnlockFromQuery(queryUnlock) : null;
  const flowchart_plus = account.flowchart_plus === true || qa?.flowchart_plus === true;
  const builder_pro = account.builder_pro === true || qa?.builder_pro === true;
  const qaAdded =
    qa != null &&
    ((qa.flowchart_plus && account.flowchart_plus !== true) ||
      (qa.builder_pro && account.builder_pro !== true));
  const source: EntitlementSource = qaAdded
    ? "qa"
    : account.flowchart_plus || account.builder_pro
      ? "account"
      : "none";
  return { flowchart_plus, builder_pro, source };
}

export function snapshotFromApi(body: unknown): EntitlementSnapshot {
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const flowchart_plus = rec?.flowchart_plus === true;
  const builder_pro = rec?.builder_pro === true;
  const source: EntitlementSource =
    rec?.source === "qa" || rec?.source === "account" || rec?.source === "none"
      ? rec.source
      : flowchart_plus || builder_pro
        ? "account"
        : "none";
  return { flowchart_plus, builder_pro, source };
}

export function clearLegacyUnlockStorage(
  storage: Pick<Storage, "removeItem"> | null | undefined,
): void {
  storage?.removeItem(UNLOCK_STORAGE_KEY);
  storage?.removeItem(UNLOCK_SOURCE_KEY);
}

export function entitlementPayload(flags: EntitlementSnapshot) {
  return {
    flowchart_plus: flags.flowchart_plus,
    builder_pro: flags.builder_pro,
    can_print_export: canPrintExport(flags),
    can_export_to_builder: canExportToBuilder(flags),
    source: flags.source,
    qa_applied: flags.source === "qa",
  };
}
