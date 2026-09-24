import { coerceGraph, type FlowGraph } from "./graph";
import { polishGraphLabels } from "./label";
import { layoutGraph } from "./layout";

export type GenerateMode = "template" | "llm";

export type LlmGraphResult = {
  graph: FlowGraph;
  mode: GenerateMode;
  reply?: string;
  llmFailed?: boolean;
};

const GRAPH_SCHEMA = `{
  "title": string,
  "nodes": [{ "id": string, "kind": "start" | "end" | "step" | "decision", "label": string }],
  "edges": [{ "id": string, "source": string, "target": string, "label"?: string }]
}`;

export const GRAPH_RULES = `You turn natural-language process descriptions into flowcharts for SOP Mojo Flowchart Studio.
Return ONLY valid JSON matching ${GRAPH_SCHEMA}.

Classify every clause dynamically from the language. Do not wait for a canned phrase list — users invent new wording.
- STEP: a sequential action (First/Second/Next/Then/After/While/Once, or an imperative).
- DECISION: any choice or yes/no test. Interrogatives (is/are/does/do/can/should …?), “decide X or Y”, “decide how…”, and any fork implied before If/else.
- BRANCH: actions that apply on only one side (If yes / If no / Yes: / No: / If we… / If you…).
- JOIN: actions that resume after both sides (Finally / Lastly / in either case).

Rules:
- Exactly one start node and one end node.
- A DECISION is kind "decision" with a short question label (e.g. "Cash register loaded?", "Oven or microwave?", "Milk or black?"). Never put earlier narrative on the diamond. Never leave an interrogative or "If yes"/"If no" as a spine step.
- Decision edges must be labeled "yes" and "no" (first alternative = yes, second = no).
- Both branches use real source steps. Do not invent "Handle the no / exception path" when the source describes both sides.
- JOIN steps sit after both branches merge, not on only one arm.
- Extract every distinct action. Do not collapse a paragraph into one or two nodes (typically 6–16 nodes for a cooked process).
- Short imperative labels (3–8 words). Steps are actions, not paragraphs. Decisions are one short question. Happy path stays the readable spine.
- Every node except end has an outgoing edge; every node except start has an incoming edge.
- Do not invent legal, medical, or ISO citations.`;

export function extractJson(text: string): unknown {
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

export function hasLlmKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export function openaiKey(): string | undefined {
  return process.env.OPENAI_API_KEY || undefined;
}

export function anthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY || undefined;
}

export function openaiModel(vision = false): string {
  if (process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL;
  return vision ? "gpt-4o-mini" : "gpt-4o-mini";
}

export function anthropicModel(vision = false): string {
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;
  return vision ? "claude-sonnet-4-5" : "claude-3-5-haiku-latest";
}

function graphFromModel(payload: unknown, fallbackTitle: string): FlowGraph {
  const rec = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const graphValue = rec.graph && typeof rec.graph === "object" ? rec.graph : payload;
  return layoutGraph(polishGraphLabels(coerceGraph(graphValue, fallbackTitle)));
}

async function openaiChat(args: {
  apiKey: string;
  system: string;
  user: string | Array<Record<string, unknown>>;
  vision?: boolean;
}): Promise<string> {
  const userContent = args.user;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel(Boolean(args.vision)),
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: userContent },
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
  return content;
}

async function anthropicChat(args: {
  apiKey: string;
  system: string;
  user: string | Array<Record<string, unknown>>;
  vision?: boolean;
}): Promise<string> {
  const content =
    typeof args.user === "string" ? args.user : args.user;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: anthropicModel(Boolean(args.vision)),
      max_tokens: 3500,
      temperature: 0.3,
      system: args.system,
      messages: [{ role: "user", content }],
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
  return text;
}

async function completeJson(system: string, user: string): Promise<unknown> {
  const openai = openaiKey();
  const anthropic = anthropicKey();
  if (openai) {
    return extractJson(await openaiChat({ apiKey: openai, system, user }));
  }
  if (anthropic) {
    return extractJson(await anthropicChat({ apiKey: anthropic, system, user }));
  }
  throw new Error("No LLM key configured.");
}

export async function generateGraphFromText(text: string): Promise<FlowGraph> {
  const payload = await completeJson(
    GRAPH_RULES,
    `Structure this process as a flowchart. Classify each clause as step, decision, branch, or join from the language itself. Interrogatives and If yes/If no must become a diamond with two real arms.\n\n${text}`,
  );
  return graphFromModel(payload, "Untitled process");
}

export async function editGraphWithChat(
  graph: FlowGraph,
  message: string,
): Promise<{ graph: FlowGraph; reply: string }> {
  const system = `${GRAPH_RULES}

You apply a modular edit to an existing flowchart. Do not regenerate from scratch unless the user asks to rewrite all.
Return JSON: { "reply": string, "graph": ${GRAPH_SCHEMA} }
Keep node ids stable when the node still exists.`;
  const payload = await completeJson(
    system,
    `Current graph:\n${JSON.stringify(graph)}\n\nUser request:\n${message}`,
  );
  const rec = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const reply = String(rec.reply ?? "Updated the flowchart.");
  return { graph: graphFromModel(payload, graph.title), reply };
}

export type VisionImage = {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  base64: string;
  dataUrl: string;
};

export function parseDataUrl(dataUrl: string): VisionImage {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new Error("Upload a JPEG, PNG, WebP, or GIF.");
  }
  const mediaType = match[1] as VisionImage["mediaType"];
  const base64 = match[2].replace(/\s+/g, "");
  if (base64.length > 6_000_000) {
    throw new Error("Photo is too large. Try a clearer crop under 4 MB.");
  }
  return { mediaType, base64, dataUrl: `data:${mediaType};base64,${base64}` };
}

export async function generateGraphFromImage(image: VisionImage): Promise<FlowGraph> {
  const system = `${GRAPH_RULES}

The user uploaded a photo of a handwritten process scribble. Read the handwriting, infer steps and decisions, and return the flowchart JSON.`;
  const openai = openaiKey();
  const anthropic = anthropicKey();
  if (openai) {
    const content = await openaiChat({
      apiKey: openai,
      system,
      vision: true,
      user: [
        {
          type: "text",
          text: "Extract the process from this handwritten scribble and return flowchart JSON.",
        },
        { type: "image_url", image_url: { url: image.dataUrl } },
      ],
    });
    return graphFromModel(extractJson(content), "Handwritten process");
  }
  if (anthropic) {
    const content = await anthropicChat({
      apiKey: anthropic,
      system,
      vision: true,
      user: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.base64,
          },
        },
        {
          type: "text",
          text: "Extract the process from this handwritten scribble and return flowchart JSON.",
        },
      ],
    });
    return graphFromModel(extractJson(content), "Handwritten process");
  }
  throw new Error("Photo reading needs OPENAI_API_KEY or ANTHROPIC_API_KEY.");
}
