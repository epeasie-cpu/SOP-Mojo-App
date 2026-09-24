/**
 * Flowchart Studio → Builder Pro import contract.
 *
 * Builder (mojo-sop-builder, PR #3) already:
 * 1. Reads `?import=flowchart` on builder.sopmojo.com
 * 2. Accepts a dropped `*-builder-import.json` (v1)
 * 3. Attaches the map image onto a SOP step
 * 4. Prints attached maps letter landscape L→R
 *
 * Seamless Send (this repo) also publishes a short-lived CORS URL:
 *   GET {flowchartJson}  — v1 package, ACAO https://builder.sopmojo.com
 *   GET {flowchartImage} — PNG preview, same CORS
 */
export const BUILDER_BRIDGE_CONTRACT = {
  format: "sop-builder-pro-import",
  version: 2,
  query: {
    import: "flowchart",
    attach: "step",
    flowchartJson: "https://flowchart.sopmojo.com/api/handoff/{id}",
    flowchartImage: "https://flowchart.sopmojo.com/api/handoff/{id}/image",
    flowchartTitle: "map title",
    step: "1-based Builder SOP step (optional)",
  },
  files: {
    json: "*-builder-import.json",
    image: "*-flowchart.png",
  },
  imageRole: "builder-step-embed",
  cors: {
    allowOrigin: "https://builder.sopmojo.com",
    methods: "GET, OPTIONS",
  },
  print: {
    orientation: "landscape" as const,
    page: "letter",
    flow: "LR",
    continuation: "edge-arrow" as const,
    css: "@page { size: letter landscape; margin: 0.4in; }",
  },
} as const;
