export const LEAVE_BROWSER_ACTIONS = [
  { id: "copy-md", label: "Copy Markdown" },
  { id: "copy-prompt", label: "Copy AI prompt" },
  { id: "print", label: "Print" },
  { id: "download-md", label: "Download Markdown" },
  { id: "download-html", label: "Download print HTML" },
] as const;

export type LeaveBrowserAction = (typeof LEAVE_BROWSER_ACTIONS)[number]["id"];

/** Generate and on-page review stay free. Leave-browser actions email the current draft first. */
export function leaveActionRequiresEmail(hasDeliveredThisDraft: boolean): boolean {
  return !hasDeliveredThisDraft;
}

export function draftDeliveryKey(sop: unknown): string {
  return JSON.stringify(sop);
}
