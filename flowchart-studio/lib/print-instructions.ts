import { listableNodes, type FlowGraph } from "./graph";

/** Written steps for the print appendix. Diagram boxes keep their own labels. */
export type PrintInstruction = {
  id: string;
  number: number;
  text: string;
};

export type InstructionFragment = {
  id: string;
  number: number;
  lines: string[];
  continued: boolean;
};

export type InstructionSheet = {
  index: number;
  total: number;
  fragments: InstructionFragment[];
};

/** 11pt type with room for a wrapped line. */
export const INSTRUCTION_FONT_PT = 11;
export const INSTRUCTION_LEADING_PT = 16;
export const INSTRUCTION_GAP_PT = 8;
/** Title + flowchart name on the first instruction page, before the list. */
export const INSTRUCTION_FIRST_HEADER_PT = 58;
/** Running "Instructions" header on later appendix pages. */
export const INSTRUCTION_NEXT_HEADER_PT = 28;
export const INSTRUCTION_FOOTER_PT = 18;
/** Readable measure on a letter-landscape sheet, including the number gutter. */
export const INSTRUCTION_MEASURE_PT = 6.8 * 72;
export const INSTRUCTION_INDENT_PT = 22;

/**
 * Step and decision labels that already exist on the map, in flow order.
 * No appendix when every listable label is blank. Does not invent procedure copy.
 */
export function printInstructions(graph: FlowGraph): PrintInstruction[] {
  const items: PrintInstruction[] = [];
  for (const node of listableNodes(graph)) {
    const label = node.label.replace(/\s+/g, " ").trim();
    if (!label) continue;
    const branches = graph.edges
      .filter((edge) => edge.source === node.id && edge.label && String(edge.label).trim())
      .map((edge) => String(edge.label).trim());
    let text = node.kind === "decision" ? `Decision: ${label}` : label;
    if (node.kind === "decision" && branches.length) {
      text += ` (${branches.join(" / ")})`;
    }
    items.push({ id: node.id, number: items.length + 1, text });
  }
  return items;
}

export function wrapInstructionText(
  text: string,
  maxWidth: number,
  widthOf: (line: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = "";

  const pushHard = (word: string) => {
    let chunk = "";
    for (const ch of word) {
      const trial = chunk + ch;
      if (chunk && widthOf(trial) > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = trial;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (widthOf(next) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (widthOf(word) <= maxWidth) current = word;
    else pushHard(word);
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Pack written steps onto letter-landscape pages that follow the diagram.
 * A step taller than one page continues on the next sheet without a new number.
 */
export function paginateInstructionSheets(
  items: PrintInstruction[],
  linesFor: (text: string) => string[],
  pageContentPt: number,
): InstructionSheet[] {
  if (items.length === 0) return [];
  const usable = Math.max(INSTRUCTION_LEADING_PT, pageContentPt - INSTRUCTION_FOOTER_PT);
  const sheets: InstructionFragment[][] = [];
  let current: InstructionFragment[] = [];
  let used = INSTRUCTION_FIRST_HEADER_PT;

  const flush = () => {
    if (current.length === 0) return;
    sheets.push(current);
    current = [];
    used = INSTRUCTION_NEXT_HEADER_PT;
  };

  for (const item of items) {
    let remaining = linesFor(item.text);
    if (remaining.length === 0) remaining = [item.text];
    let continued = false;
    while (remaining.length > 0) {
      let fit = Math.floor((usable - used - INSTRUCTION_GAP_PT) / INSTRUCTION_LEADING_PT);
      if (fit <= 0) {
        if (current.length === 0) fit = 1;
        else {
          flush();
          continue;
        }
      }
      const take = remaining.slice(0, fit);
      remaining = remaining.slice(fit);
      current.push({
        id: item.id,
        number: item.number,
        lines: take,
        continued,
      });
      used += take.length * INSTRUCTION_LEADING_PT + INSTRUCTION_GAP_PT;
      continued = true;
      if (remaining.length > 0) flush();
    }
  }
  flush();

  return sheets.map((fragments, index) => ({
    index,
    total: sheets.length,
    fragments,
  }));
}
