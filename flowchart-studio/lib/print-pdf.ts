import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { FlowGraph, FlowNode } from "./graph";
import { measurePrintNode, PRINT_EDGE_GUTTER, scalePrintGraph } from "./layout";
import {
  INSTRUCTION_FIRST_HEADER_PT,
  INSTRUCTION_FONT_PT,
  INSTRUCTION_GAP_PT,
  INSTRUCTION_INDENT_PT,
  INSTRUCTION_LEADING_PT,
  INSTRUCTION_MEASURE_PT,
  INSTRUCTION_NEXT_HEADER_PT,
  paginateInstructionSheets,
  printInstructions,
  wrapInstructionText,
  type InstructionSheet,
} from "./print-instructions";
import { continuationDraw, printEdgePath } from "./print-map";
import { paginatePrintMap, type PrintContinuationStub } from "./print-pages";

const PT_PER_IN = 72;
const CSS_PX_PER_IN = 96;

/** CSS pixels at 96dpi → PDF points, matching browser print layout. */
function px(value: number): number {
  return (value * PT_PER_IN) / CSS_PX_PER_IN;
}

export const PDF_PAGE_WIDTH = 11 * PT_PER_IN;
export const PDF_PAGE_HEIGHT = 8.5 * PT_PER_IN;
export const PDF_MARGIN = 0.4 * PT_PER_IN;
export const PDF_SHEET_HEIGHT = 7.4 * PT_PER_IN;

const INK = rgb(24 / 255, 24 / 255, 27 / 255);
const BORDER = rgb(63 / 255, 63 / 255, 70 / 255);
const START_FILL = rgb(244 / 255, 255 / 255, 230 / 255);
const START_BORDER = rgb(63 / 255, 107 / 255, 16 / 255);
const MUTED = rgb(82 / 255, 82 / 255, 91 / 255);
const WHITE = rgb(1, 1, 1);

export type PrintPdfPagePlan = {
  index: number;
  total: number;
  /** Points from the top of the 7.4in centered sheet to the title/map block. */
  blockOffset: number;
  mapHeight: number;
  titleHeight: number;
  /** Diagram sheets no longer reserve space for the written-step appendix. */
  stepsHeight: number;
  pageNumberHeight: number;
  continuations: PrintContinuationStub[];
};

function pdfSafe(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

/** Page plan shared with the on-screen print sheets (paginate + scale). */
export function planPrintPdf(graph: FlowGraph): PrintPdfPagePlan[] {
  const slices = paginatePrintMap(graph);
  return slices.map((slice) => {
    const scaled = scalePrintGraph(slice.graph);
    const titleHeight = slice.index === 0 ? 16 * 1.2 + 0.12 * PT_PER_IN : 0;
    const mapHeight = px(scaled.height);
    const pageNumberHeight = slice.total > 1 ? 8 + 0.08 * PT_PER_IN : 0;
    const block = titleHeight + mapHeight + pageNumberHeight;
    return {
      index: slice.index,
      total: slice.total,
      blockOffset: Math.max(0, (PDF_SHEET_HEIGHT - block) / 2),
      mapHeight,
      titleHeight,
      stepsHeight: 0,
      pageNumberHeight,
      continuations: slice.continuations,
    };
  });
}

function pathPoints(d: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const re = /[ML]\s*(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d))) {
    points.push({ x: Number(match[1]), y: Number(match[2]) });
  }
  return points;
}

function drawArrow(page: PDFPage, tipX: number, tipY: number, dir: "left" | "right") {
  const path = dir === "right" ? "M 0 0 L -9 -4 L -9 4 Z" : "M 0 0 L 9 -4 L 9 4 Z";
  page.drawSvgPath(path, {
    x: tipX,
    y: tipY,
    scale: PT_PER_IN / CSS_PX_PER_IN,
    color: INK,
  });
}

function drawLabel(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  yTop: number,
  w: number,
  h: number,
  yAt: (fromSheetTop: number) => number,
  size: number,
) {
  const safe = pdfSafe(text);
  if (!safe) return;
  const maxWidth = Math.max(8, w - 8);
  const words = safe.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === 3) break;
  }
  if (current && lines.length < 3) lines.push(current);
  const shown = lines.slice(0, 3);
  const leading = size * 1.15;
  const block = shown.length * leading;
  let cursor = yTop + Math.max(0, (h - block) / 2) + size * 0.8;
  for (const line of shown) {
    const width = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: x + Math.max(2, (w - width) / 2),
      y: yAt(cursor),
      size,
      font,
      color: INK,
    });
    cursor += leading;
  }
}

function drawShape(
  page: PDFPage,
  node: FlowNode,
  x: number,
  yTop: number,
  w: number,
  h: number,
  yAt: (fromSheetTop: number) => number,
) {
  const top = yAt(yTop);
  if (node.kind === "decision") {
    const insetX = w * 0.18;
    const insetY = h * 0.18;
    page.drawSvgPath(
      `M ${w / 2} ${insetY} L ${w - insetX} ${h / 2} L ${w / 2} ${h - insetY} L ${insetX} ${h / 2} Z`,
      {
        x,
        y: top,
        color: WHITE,
        borderColor: BORDER,
        borderWidth: 0.8,
      },
    );
    return;
  }
  if (node.kind === "start" || node.kind === "end") {
    const r = h / 2;
    const fill = node.kind === "start" ? START_FILL : WHITE;
    const border = node.kind === "start" ? START_BORDER : BORDER;
    page.drawSvgPath(
      `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`,
      {
        x,
        y: top,
        color: fill,
        borderColor: border,
        borderWidth: 0.8,
      },
    );
    return;
  }
  page.drawSvgPath(`M 0 0 H ${w} V ${h} H 0 Z`, {
    x,
    y: top,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.8,
  });
}

/** Written steps on their own letter-landscape pages after the diagram. */
export function buildInstructionSheets(graph: FlowGraph, font: PDFFont): InstructionSheet[] {
  const items = printInstructions(graph).flatMap((item) => {
    const text = pdfSafe(item.text);
    return text ? [{ ...item, text }] : [];
  });
  const maxWidth = INSTRUCTION_MEASURE_PT - INSTRUCTION_INDENT_PT;
  return paginateInstructionSheets(
    items,
    (text) =>
      wrapInstructionText(text, maxWidth, (line) => font.widthOfTextAtSize(line, INSTRUCTION_FONT_PT)),
    PDF_PAGE_HEIGHT - PDF_MARGIN * 2,
  );
}

function drawInstructionSheet(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  title: string,
  sheet: InstructionSheet,
  yAt: (fromSheetTop: number) => number,
) {
  const contentRight = PDF_PAGE_WIDTH - PDF_MARGIN;
  const contentHeight = PDF_PAGE_HEIGHT - PDF_MARGIN * 2;
  let cursor = sheet.index === 0 ? INSTRUCTION_FIRST_HEADER_PT : INSTRUCTION_NEXT_HEADER_PT;

  if (sheet.index === 0) {
    page.drawText("Instructions", {
      x: PDF_MARGIN,
      y: yAt(18),
      size: 16,
      font: bold,
      color: INK,
    });
    const sub = pdfSafe(title);
    if (sub) {
      page.drawText(sub, {
        x: PDF_MARGIN,
        y: yAt(40),
        size: 10,
        font,
        color: MUTED,
      });
    }
  } else {
    page.drawText("Instructions", {
      x: PDF_MARGIN,
      y: yAt(14),
      size: 11,
      font: bold,
      color: INK,
    });
  }

  const textX = PDF_MARGIN + INSTRUCTION_INDENT_PT;
  for (const fragment of sheet.fragments) {
    fragment.lines.forEach((line, lineIndex) => {
      const baseline = cursor + INSTRUCTION_FONT_PT;
      if (lineIndex === 0 && !fragment.continued) {
        page.drawText(`${fragment.number}.`, {
          x: PDF_MARGIN,
          y: yAt(baseline),
          size: INSTRUCTION_FONT_PT,
          font,
          color: INK,
        });
      }
      page.drawText(line, {
        x: textX,
        y: yAt(baseline),
        size: INSTRUCTION_FONT_PT,
        font,
        color: INK,
      });
      cursor += INSTRUCTION_LEADING_PT;
    });
    cursor += INSTRUCTION_GAP_PT;
  }

  if (sheet.total > 1) {
    const label = `Instructions ${sheet.index + 1} of ${sheet.total}`;
    const width = font.widthOfTextAtSize(label, 8);
    page.drawText(label, {
      x: contentRight - width,
      y: yAt(contentHeight - 2),
      size: 8,
      font,
      color: MUTED,
    });
  }
}

/**
 * Letter-landscape PDF of the same pages the studio prints:
 * dense boxes, edge-arrow continuation, diagram centered on its sheets,
 * then written steps on their own pages when the map has step text.
 */
export async function renderPrintPdf(graph: FlowGraph): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(pdfSafe(graph.title) || "Flowchart");
  pdf.setAuthor("Flowchart Studio");
  pdf.setCreator("Flowchart Studio");
  pdf.setSubject("flowchart-click-to-open");

  const slices = paginatePrintMap(graph);
  const plans = planPrintPdf(graph);
  const sheetTop = PDF_PAGE_HEIGHT - PDF_MARGIN;
  const yAt = (fromSheetTop: number) => sheetTop - fromSheetTop;

  slices.forEach((slice, index) => {
    const plan = plans[index];
    const page = pdf.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PDF_PAGE_WIDTH,
      height: PDF_PAGE_HEIGHT,
      color: WHITE,
    });

    const scaled = scalePrintGraph(slice.graph);
    const gutterPx = slice.continuations.some((stub) => stub.side === "left")
      ? PRINT_EDGE_GUTTER * scaled.scale
      : 0;
    const mapTop = plan.blockOffset + plan.titleHeight;

    if (slice.index === 0) {
      const title = pdfSafe(graph.title) || "Flowchart";
      page.drawText(title, {
        x: PDF_MARGIN,
        y: yAt(plan.blockOffset + 16),
        size: 16,
        font: bold,
        color: INK,
      });
    }

    for (const edge of scaled.graph.edges) {
      const d = printEdgePath(scaled.graph, edge.id);
      if (!d) continue;
      const points = pathPoints(d);
      for (let i = 1; i < points.length; i += 1) {
        const from = points[i - 1];
        const to = points[i];
        page.drawLine({
          start: {
            x: PDF_MARGIN + px(gutterPx + from.x * scaled.scale),
            y: yAt(mapTop + px(from.y * scaled.scale)),
          },
          end: {
            x: PDF_MARGIN + px(gutterPx + to.x * scaled.scale),
            y: yAt(mapTop + px(to.y * scaled.scale)),
          },
          thickness: px(1.6),
          color: INK,
        });
      }
    }

    for (const node of scaled.graph.nodes) {
      const dim = measurePrintNode(node);
      const x = PDF_MARGIN + px(gutterPx + node.position.x * scaled.scale);
      const yTop = mapTop + px(node.position.y * scaled.scale);
      const w = px(dim.width * scaled.scale);
      const h = px(dim.height * scaled.scale);
      drawShape(page, node, x, yTop, w, h, yAt);
      drawLabel(page, bold, node.label, x, yTop, w, h, yAt, px(9 * scaled.scale));
      if (node.kind === "decision") {
        const yesSize = px(7 * scaled.scale);
        const yesW = bold.widthOfTextAtSize("Yes", yesSize);
        page.drawText("Yes", {
          x: x + w - yesW - px(2),
          y: yAt(yTop + h / 2 + yesSize * 0.25),
          size: yesSize,
          font: bold,
          color: INK,
        });
        const noW = bold.widthOfTextAtSize("No", yesSize);
        page.drawText("No", {
          x: x + (w - noW) / 2,
          y: yAt(yTop + h - px(3)),
          size: yesSize,
          font: bold,
          color: INK,
        });
      }
    }

    const contentRight = PDF_PAGE_WIDTH - PDF_MARGIN;
    for (const stub of slice.continuations) {
      const node = scaled.graph.nodes.find((item) => item.id === stub.nodeId);
      if (!node) continue;
      const draw = continuationDraw(node, stub, gutterPx, scaled.scale);
      const y = yAt(mapTop + px(draw.y));
      const nodeX = PDF_MARGIN + px(draw.nodeX);
      const arrow = px(9);
      const thickness = px(1.75);
      if (draw.role === "exit" && draw.side === "right") {
        page.drawLine({
          start: { x: nodeX, y },
          end: { x: contentRight - arrow, y },
          thickness,
          color: INK,
        });
        drawArrow(page, contentRight, y, "right");
      } else if (draw.role === "exit" && draw.side === "left") {
        page.drawLine({
          start: { x: PDF_MARGIN + arrow, y },
          end: { x: nodeX, y },
          thickness,
          color: INK,
        });
        drawArrow(page, PDF_MARGIN, y, "left");
      } else if (draw.role === "enter" && draw.side === "left") {
        page.drawLine({
          start: { x: PDF_MARGIN, y },
          end: { x: Math.max(PDF_MARGIN, nodeX - arrow), y },
          thickness,
          color: INK,
        });
        drawArrow(page, nodeX, y, "right");
      } else {
        page.drawLine({
          start: { x: nodeX + arrow, y },
          end: { x: contentRight, y },
          thickness,
          color: INK,
        });
        drawArrow(page, nodeX, y, "left");
      }
    }

    if (slice.total > 1) {
      const label = `Page ${slice.index + 1} of ${slice.total}`;
      const width = font.widthOfTextAtSize(label, 8);
      page.drawText(label, {
        x: contentRight - width,
        y: yAt(mapTop + plan.mapHeight + 0.08 * PT_PER_IN + 8),
        size: 8,
        font,
        color: MUTED,
      });
    }

  });

  for (const sheet of buildInstructionSheets(graph, font)) {
    const page = pdf.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PDF_PAGE_WIDTH,
      height: PDF_PAGE_HEIGHT,
      color: WHITE,
    });
    drawInstructionSheet(page, font, bold, graph.title, sheet, yAt);
  }

  return pdf.save();
}
