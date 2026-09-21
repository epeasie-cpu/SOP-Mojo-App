import { beforeEach, describe, expect, it, vi } from "vitest";
import { CASH_REGISTER_PROMPT } from "@/lib/parse-process";
import { demoGraph } from "@/lib/template-graph";

const generateGraphFromText = vi.hoisted(() => vi.fn());

vi.mock("@/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
  return {
    ...actual,
    generateGraphFromText,
  };
});

import { runGenerate } from "@/lib/pipeline";

describe("runGenerate path selection", () => {
  beforeEach(() => {
    generateGraphFromText.mockReset();
    vi.unstubAllEnvs();
  });

  it("calls the LLM structurer when OPENAI_API_KEY is set", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    generateGraphFromText.mockResolvedValue(demoGraph());
    const result = await runGenerate(CASH_REGISTER_PROMPT);
    expect(generateGraphFromText).toHaveBeenCalledTimes(1);
    expect(generateGraphFromText).toHaveBeenCalledWith(CASH_REGISTER_PROMPT);
    expect(result.mode).toBe("llm");
    expect(result.llmFailed).toBeFalsy();
  });

  it("uses the deterministic parser only when no LLM key is set", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await runGenerate(CASH_REGISTER_PROMPT);
    expect(generateGraphFromText).not.toHaveBeenCalled();
    expect(result.mode).toBe("template");
    expect(result.graph.nodes.some((node) => node.kind === "decision")).toBe(true);
    expect(result.graph.nodes.some((node) => /loaded/i.test(node.label))).toBe(true);
  });
});
