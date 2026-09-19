import { describe, expect, it } from "vitest";
import { extractJson } from "@/lib/llm";

describe("llm json extract", () => {
  it("parses fenced and raw objects", () => {
    expect(extractJson('```json\n{"title":"A"}\n```')).toEqual({ title: "A" });
    expect(extractJson('noise {"title":"B","nodes":[]} trailing')).toEqual({
      title: "B",
      nodes: [],
    });
  });
});
