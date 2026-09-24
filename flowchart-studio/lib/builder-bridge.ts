/**
 * Flowchart Studio → Builder Pro import contract.
 *
 * Builder (mojo-sop-builder) follow-up should:
 * 1. Read `?import=flowchart&attach=step` on builder.sopmojo.com
 * 2. Accept a dropped/uploaded `*-builder-import.json` (this format)
 * 3. Attach `attachments.image` (PNG) onto the target SOP step as the step image
 * 4. Reuse print: `@page { size: letter landscape; margin: 0.4in }` and L→R flow
 *
 * This repo owns the payload, PNG export, and send URL. Builder owns ingest UI.
 */
export const BUILDER_BRIDGE_CONTRACT = {
  format: "sop-builder-pro-import",
  version: 2,
  query: {
    import: "flowchart",
    attach: "step",
  },
  files: {
    json: "*-builder-import.json",
    image: "*-flowchart.png",
  },
  imageRole: "builder-step-embed",
  print: {
    orientation: "landscape" as const,
    page: "letter",
    flow: "LR",
    css: "@page { size: letter landscape; margin: 0.4in; }",
  },
} as const;
