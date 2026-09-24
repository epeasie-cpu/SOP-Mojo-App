/**
 * US Letter landscape page box.
 * Chrome's print dialog stays on portrait for a named Letter size plus a landscape keyword.
 * Width then height (11in × 8.5in) is what preview, Save as PDF, and window.print() honor.
 * Keep this rule outside a print-only sheet so the dialog reads it before print media applies.
 */
export const PRINT_PAGE_RULE = "@page { size: 11in 8.5in; margin: 0.4in; }";

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
