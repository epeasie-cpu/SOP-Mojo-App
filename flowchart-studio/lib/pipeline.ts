import { applyChatFallback } from "./chat-fallback";
import {
  coerceGraph,
  emptyGraph,
  validateGraph,
  type FlowGraph,
} from "./graph";
import {
  editGraphWithChat,
  generateGraphFromImage,
  generateGraphFromText,
  hasLlmKey,
  parseDataUrl,
  type GenerateMode,
  type LlmGraphResult,
} from "./llm";
import { generateTemplateGraph } from "./template-graph";

export function prepareGraph(value: unknown, fallbackTitle?: string): FlowGraph {
  const graph = coerceGraph(value, fallbackTitle);
  const error = validateGraph(graph);
  if (error) throw new Error(error);
  return graph;
}

async function generateWithLlm(text: string): Promise<FlowGraph> {
  try {
    return await generateGraphFromText(text);
  } catch (first) {
    try {
      return await generateGraphFromText(text);
    } catch (retry) {
      throw retry instanceof Error ? retry : first;
    }
  }
}

/** LLM is the production Map-it brain. Deterministic parse-process is no-key / LLM-failure fallback only. */
export async function runGenerate(text: string): Promise<LlmGraphResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { graph: emptyGraph(), mode: "template" };
  }
  if (!hasLlmKey()) {
    return { graph: generateTemplateGraph(trimmed), mode: "template" };
  }
  try {
    return { graph: await generateWithLlm(trimmed), mode: "llm" };
  } catch (error) {
    console.error("Map-it LLM failed; using deterministic fallback.", error);
    return { graph: generateTemplateGraph(trimmed), mode: "llm", llmFailed: true };
  }
}

export async function runVision(dataUrl: string): Promise<LlmGraphResult> {
  const image = parseDataUrl(dataUrl);
  if (!hasLlmKey()) {
    throw new Error("Photo reading needs OPENAI_API_KEY or ANTHROPIC_API_KEY.");
  }
  try {
    return { graph: await generateGraphFromImage(image), mode: "llm" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vision failed.";
    throw new Error(message);
  }
}

export async function runChat(
  graphValue: unknown,
  message: string,
): Promise<{ graph: FlowGraph; reply: string; mode: GenerateMode; llmFailed?: boolean }> {
  const graph = prepareGraph(graphValue);
  const trimmed = message.trim();
  if (!trimmed) {
    return { graph, reply: "Tell me what to change.", mode: hasLlmKey() ? "llm" : "template" };
  }
  if (!hasLlmKey()) {
    const local = applyChatFallback(graph, trimmed);
    return { graph: local.graph, reply: local.reply, mode: "template" };
  }
  try {
    const edited = await editGraphWithChat(graph, trimmed);
    return { ...edited, mode: "llm" };
  } catch {
    const local = applyChatFallback(graph, trimmed);
    return {
      graph: local.graph,
      reply: local.applied
        ? `${local.reply} (AI was unavailable — used a local edit.)`
        : "AI was unavailable. Try “delete step 2”, “make step 2 a yes/no branch”, or “rename step 1 to …”.",
      mode: "llm",
      llmFailed: true,
    };
  }
}
