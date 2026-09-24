import { describe, expect, it } from "vitest";
import { emptyGraph, type FlowGraph } from "@/lib/graph";
import {
  INSTRUCTION_FIRST_HEADER_PT,
  INSTRUCTION_FOOTER_PT,
  INSTRUCTION_GAP_PT,
  INSTRUCTION_LEADING_PT,
  paginateInstructionSheets,
  printInstructions,
  wrapInstructionText,
  type PrintInstruction,
} from "@/lib/print-instructions";
import { demoGraph } from "@/lib/template-graph";

describe("print instructions", () => {
  it("prints existing step text and skips a map with no steps", () => {
    expect(printInstructions(emptyGraph())).toEqual([]);
    const steps = printInstructions(demoGraph());
    expect(steps.map((item) => item.number)).toEqual([1, 2, 3, 4, 5]);
    expect(steps.map((item) => item.text)).toEqual([
      "Capture the new client request",
      "Decision: Is intake complete? (yes / no)",
      "Create the workspace and kickoff SOP",
      "Ask for missing documents",
      "Send welcome pack",
    ]);
    expect(steps.some((item) => item.text === "Start" || item.text === "End")).toBe(false);
    expect(steps.some((item) => /begin the process/i.test(item.text))).toBe(false);
  });

  it("drops blank labels instead of inventing step copy", () => {
    const graph: FlowGraph = {
      title: "Blank",
      nodes: [
        { id: "start", kind: "start", label: "Start", position: { x: 0, y: 0 } },
        { id: "s1", kind: "step", label: "   ", position: { x: 0, y: 0 } },
        { id: "s2", kind: "step", label: "File the form", position: { x: 0, y: 0 } },
        { id: "end", kind: "end", label: "End", position: { x: 0, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "s1" },
        { id: "e2", source: "s1", target: "s2" },
        { id: "e3", source: "s2", target: "end" },
      ],
    };
    expect(printInstructions(graph)).toEqual([
      { id: "s2", number: 1, text: "File the form" },
    ]);
  });

  it("wraps on word boundaries", () => {
    const lines = wrapInstructionText("alpha beta gamma", 10, (line) => line.length);
    expect(lines).toEqual(["alpha beta", "gamma"]);
  });

  it("puts overflow steps on a following instruction sheet", () => {
    const items: PrintInstruction[] = [
      { id: "a", number: 1, text: "one" },
      { id: "b", number: 2, text: "two" },
      { id: "c", number: 3, text: "three" },
    ];
    const usedForTwo =
      INSTRUCTION_FIRST_HEADER_PT + 2 * (INSTRUCTION_LEADING_PT + INSTRUCTION_GAP_PT);
    const sheets = paginateInstructionSheets(items, (text) => [text], usedForTwo + INSTRUCTION_FOOTER_PT);
    expect(sheets.map((sheet) => sheet.fragments.map((fragment) => fragment.number))).toEqual([
      [1, 2],
      [3],
    ]);
    expect(sheets[1].fragments[0].continued).toBe(false);
  });

  it("continues one long step onto the next page without a new number", () => {
    const items: PrintInstruction[] = [{ id: "a", number: 1, text: "long" }];
    const lines = ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8", "l9", "l10"];
    const usable = INSTRUCTION_FIRST_HEADER_PT + INSTRUCTION_GAP_PT + 3 * INSTRUCTION_LEADING_PT;
    const sheets = paginateInstructionSheets(items, () => lines, usable + INSTRUCTION_FOOTER_PT);
    expect(sheets.length).toBeGreaterThan(1);
    expect(sheets.every((sheet) => sheet.fragments.every((fragment) => fragment.number === 1))).toBe(
      true,
    );
    expect(sheets[0].fragments[0].continued).toBe(false);
    expect(sheets[1].fragments[0].continued).toBe(true);
    expect(sheets.flatMap((sheet) => sheet.fragments.flatMap((fragment) => fragment.lines))).toEqual(
      lines,
    );
  });
});
