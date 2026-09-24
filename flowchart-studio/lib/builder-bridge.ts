/**
 * Flowchart Studio → Builder Pro contract (mojo-sop-builder PR #5).
 *
 * Maps are rows in the shared Supabase table `public.flowchart_maps`, written
 * with the signed-in user's access token so RLS keeps `user_id = auth.uid()`.
 * Export calls Builder directly. Studio does not open
 * `?import=flowchart&flowchartJson=` to auto-create a step.
 *
 * Builder migration: database/migrations/20260924_flowchart_library_and_placement.sql
 */
export const ATTACH_PLACEMENT_OWN = "own" as const;
export const ATTACH_PLACEMENT_STEP = "step" as const;

export const BUILDER_STUDIO_PATHS = {
  sops: "/api/studio/sops",
  steps: (sopId: string) => `/api/studio/sops/${encodeURIComponent(sopId)}/steps`,
  attach: "/api/studio/attach",
} as const;

export const FLOWCHART_MAPS_TABLE = "flowchart_maps";

export const BUILDER_BRIDGE_CONTRACT = {
  format: "sop-builder-pro-import",
  version: 2,
  imageRole: "builder-step-embed",
  files: {
    json: "*-builder-import.json",
    image: "*-flowchart.png",
    pdf: "*-flowchart.pdf",
  },
  auth: "Authorization: Bearer <Supabase access token>; apikey: <anon key> on PostgREST",
  table: {
    name: FLOWCHART_MAPS_TABLE,
    schema: "public",
    rls: "user_id = auth.uid()",
    columns: ["title", "purpose", "graph", "image_url", "document", "user_id"],
    graph: "{ title, nodes, edges }",
    migration: "database/migrations/20260924_flowchart_library_and_placement.sql",
  },
  builderApi: {
    sops: "GET /api/studio/sops",
    steps: "GET /api/studio/sops/{sopId}/steps",
    attach: "POST /api/studio/attach",
  },
  attach: {
    placementOwn: ATTACH_PLACEMENT_OWN,
    placementStep: ATTACH_PLACEMENT_STEP,
    response: ["stepId", "placement", "pdfUrl", "printable"],
  },
  /**
   * Deprecated. Older Send opened Builder with this query and a live handoff
   * payload, which auto-spawned a step. Export now uses the wizard + attach API.
   */
  deprecatedQuery: {
    import: "flowchart",
    attach: "step",
    flowchartJson: "https://flowchart.sopmojo.com/api/handoff/{id}",
    flowchartImage: "https://flowchart.sopmojo.com/api/handoff/{id}/image",
    flowchartTitle: "map title",
    step: "1-based Builder SOP step (optional)",
  },
  print: {
    orientation: "landscape" as const,
    page: "letter",
    flow: "LR",
    continuation: "edge-arrow" as const,
    css: "@page { size: letter landscape; margin: 0.4in; }",
  },
} as const;
