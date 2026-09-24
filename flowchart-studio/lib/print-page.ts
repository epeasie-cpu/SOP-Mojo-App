import { slugify } from "./graph";

/**
 * US Letter landscape page box for Ctrl/Cmd+P preview.
 * Linux GTK Page Setup ignores this and stays Portrait / A4, so the Print button
 * does not use window.print(). It opens the pdf-lib file (11×8.5in) instead.
 */
export const PRINT_PAGE_RULE = "@page { size: 11in 8.5in; margin: 0.4in; }";

export function printPdfFilename(title: string): string {
  return `${slugify(title)}-flowchart.pdf`;
}

/** Open the landscape PDF. Download it if the new tab was blocked. */
export function presentPrintPdf(
  bytes: Uint8Array,
  filename: string,
  preview: Window | null,
): "opened" | "downloaded" {
  const copy = new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: "application/pdf" }));
  const revokeLater = () => window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  if (preview && !preview.closed) {
    preview.location.href = url;
    revokeLater();
    return "opened";
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  revokeLater();
  return "downloaded";
}

const PRINT_PAGE_STYLE_ID = "flowchart-studio-page";

/** Re-assert the landscape page box as the last @page rule before printing. */
export function ensurePrintPageStyle(): void {
  if (typeof document === "undefined") return;
  let style = document.getElementById(PRINT_PAGE_STYLE_ID);
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement("style");
    style.id = PRINT_PAGE_STYLE_ID;
    (document.body ?? document.head).appendChild(style);
  }
  style.textContent = PRINT_PAGE_RULE;
}
