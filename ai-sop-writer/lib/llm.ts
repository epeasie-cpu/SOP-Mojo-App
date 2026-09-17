import type { GenerateMode, SopDraft, SopInput } from "./sop";
import { generateTemplateSop } from "./template-engine";

const SOP_JSON_INSTRUCTION = `You write first-draft standard operating procedures (SOPs) for small and mid-sized businesses.
SOP means standard operating procedure, never statement of purpose.
The product name is AI SOP Writer. Do not call it Draft Engine, SOP Builder, or SOP Generator.

Return ONLY valid JSON matching:
{
  "title": string,
  "purpose": string,
  "owner": string,
  "trigger": string,
  "tools": string[],
  "kpi": string,
  "steps": [{ "number": number, "title": string, "detail": string }],
  "exceptions": string[],
  "checklist": string[],
  "safetyNotes": string[]
}

Rules:
- Original language. Do not copy third-party SOP packs.
- Do not invent legal, OSHA, ISO, or medical citations.
- Steps must be observable actions (6 to 8 steps).
- Include realistic exceptions for this kind of work.
- Safety notes must be practical for the business type.
- Owner should be the provided role.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model did not return JSON.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function coerceDraft(value: unknown, input: SopInput): SopDraft {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid SOP payload.");
  }
  const v = value as Record<string, unknown>;
  const stepsRaw = Array.isArray(v.steps) ? v.steps : [];
  const steps = stepsRaw.map((step, index) => {
    const s = step && typeof step === "object" ? (step as Record<string, unknown>) : {};
    return {
      number: typeof s.number === "number" ? s.number : index + 1,
      title: String(s.title ?? `Step ${index + 1}`),
      detail: String(s.detail ?? s.description ?? ""),
    };
  });
  const list = (key: string) =>
    Array.isArray(v[key]) ? v[key].map((item) => String(item)).filter(Boolean) : [];
  return {
    title: String(v.title ?? `${input.processName} — standard operating procedure`),
    purpose: String(v.purpose ?? ""),
    owner: String(v.owner ?? input.role),
    trigger: String(v.trigger ?? input.trigger ?? ""),
    tools: list("tools"),
    kpi: String(v.kpi ?? input.kpi ?? ""),
    steps,
    exceptions: list("exceptions"),
    checklist: list("checklist"),
    safetyNotes: list("safetyNotes"),
  };
}

function userPrompt(input: SopInput): string {
  return `Business type: ${input.businessType}
Process name: ${input.processName}
Role / owner: ${input.role}
Tools: ${input.tools || "(not specified)"}
Outcome / KPI: ${input.kpi || "(not specified)"}
Trigger: ${input.trigger || "(not specified)"}`;
}

async function generateWithOpenAi(input: SopInput, apiKey: string): Promise<SopDraft> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SOP_JSON_INSTRUCTION },
        { role: "user", content: userPrompt(input) },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response.");
  return coerceDraft(extractJson(content), input);
}

async function generateWithAnthropic(input: SopInput, apiKey: string): Promise<SopDraft> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 2500,
      temperature: 0.4,
      system: SOP_JSON_INSTRUCTION,
      messages: [{ role: "user", content: userPrompt(input) }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic error ${response.status}`);
  }
  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.map((block) => block.text ?? "").join("\n") ?? "";
  if (!text) throw new Error("Anthropic returned an empty response.");
  return coerceDraft(extractJson(text), input);
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export async function generateSop(input: SopInput): Promise<{
  sop: SopDraft;
  mode: GenerateMode;
  llmFailed?: boolean;
}> {
  const openai = process.env.OPENAI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (!openai && !anthropic) {
    return { sop: generateTemplateSop(input), mode: "template" };
  }
  try {
    const sop = openai
      ? await generateWithOpenAi(input, openai)
      : await generateWithAnthropic(input, anthropic as string);
    return { sop, mode: "llm" };
  } catch {
    return { sop: generateTemplateSop(input), mode: "llm", llmFailed: true };
  }
}
