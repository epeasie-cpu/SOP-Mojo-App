export type SopInput = {
  businessType: string;
  processName: string;
  role: string;
  tools?: string;
  kpi?: string;
  trigger?: string;
};

export type SopStep = {
  number: number;
  title: string;
  detail: string;
};

export type SopDraft = {
  title: string;
  purpose: string;
  owner: string;
  trigger: string;
  tools: string[];
  kpi: string;
  steps: SopStep[];
  exceptions: string[];
  checklist: string[];
  safetyNotes: string[];
};

export type GenerateMode = "llm" | "template";

export const SOP_FIELDS = [
  "purpose",
  "owner",
  "trigger",
  "tools",
  "kpi",
  "steps",
  "exceptions",
  "checklist",
  "safetyNotes",
] as const;
