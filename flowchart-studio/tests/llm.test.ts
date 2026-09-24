import { describe, expect, it } from "vitest";
import { extractJson, GRAPH_RULES, hasLlmKey } from "@/lib/llm";

describe("llm json extract", () => {
  it("parses fenced and raw objects", () => {
    expect(extractJson('```json\n{"title":"A"}\n```')).toEqual({ title: "A" });
    expect(extractJson('noise {"title":"B","nodes":[]} trailing')).toEqual({
      title: "B",
      nodes: [],
    });
  });
});

describe("llm graph rules", () => {
  it("classifies decision vs step from language instead of a phrase catalog", () => {
    expect(GRAPH_RULES).toMatch(/classif/i);
    expect(GRAPH_RULES).toMatch(/interrogative/i);
    expect(GRAPH_RULES).toMatch(/If yes/);
    expect(GRAPH_RULES).toMatch(/decision/i);
    expect(GRAPH_RULES).toMatch(/3–8 words/);
    expect(hasLlmKey()).toBe(Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY));
  });
});
