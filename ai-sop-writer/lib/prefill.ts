import type { SopInput } from "./sop";

const MAX_LEN = 120;

/** Drop control characters and cap outreach query values. Empty means "use the prop". */
export function sanitizePrefillParam(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, MAX_LEN);
}

export function formFromPrefill(
  prefill: Partial<SopInput> | undefined,
  base?: Partial<SopInput>,
): SopInput {
  return {
    businessType: prefill?.businessType ?? base?.businessType ?? "",
    processName: prefill?.processName ?? base?.processName ?? "",
    role: prefill?.role ?? base?.role ?? "",
    tools: prefill?.tools ?? base?.tools ?? "",
    kpi: prefill?.kpi ?? base?.kpi ?? "",
    trigger: prefill?.trigger ?? base?.trigger ?? "",
  };
}

/**
 * Query wins when it has a value. An empty or missing query leaves the prop in place.
 * Supported params: process, business, role.
 */
export function mergePrefill(
  defaults: Partial<SopInput> | undefined,
  query: { process?: string | null; business?: string | null; role?: string | null },
): { form: SopInput; fromQuery: boolean } {
  const processName = sanitizePrefillParam(query.process);
  const businessType = sanitizePrefillParam(query.business);
  const role = sanitizePrefillParam(query.role);
  const fromQuery = Boolean(processName || businessType || role);
  return {
    fromQuery,
    form: {
      businessType: businessType || defaults?.businessType || "",
      processName: processName || defaults?.processName || "",
      role: role || defaults?.role || "",
      tools: defaults?.tools ?? "",
      kpi: defaults?.kpi ?? "",
      trigger: defaults?.trigger ?? "",
    },
  };
}
