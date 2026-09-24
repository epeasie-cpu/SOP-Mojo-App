/**
 * Flowchart Studio → Builder Pro contract.
 *
 * Primary path: save the map on the signed-in user, then attach a print PDF.
 * Builder (mojo-sop-builder) lists SOPs/steps and stores the PDF. Studio does
 * not open `?import=flowchart&flowchartJson=` to auto-create a step.
 *
 * Auth on every library and Builder call:
 *   Authorization: Bearer <Supabase access token from the shared Builder project>
 */
export const ATTACH_VIEW = "flowchart-click-to-open" as const;
export const OWN_STEP_PLACEMENT = "own-step" as const;
export const EXISTING_STEP_PLACEMENT = "existing-step" as const;

export const BUILDER_FLOWCHART_PATHS = {
  sops: "/api/flowchart-studio/sops",
  steps: (sopId: string) =>
    `/api/flowchart-studio/sops/${encodeURIComponent(sopId)}/steps`,
  attach: "/api/flowchart-studio/attach",
} as const;

export const LIBRARY_PATHS = {
  collection: "/api/library",
  map: (id: string) => `/api/library/${encodeURIComponent(id)}`,
  pdf: (id: string) => `/api/library/${encodeURIComponent(id)}/pdf`,
} as const;

export const BUILDER_BRIDGE_CONTRACT = {
  format: "sop-builder-pro-import",
  version: 2,
  imageRole: "builder-step-embed",
  files: {
    json: "*-builder-import.json",
    image: "*-flowchart.png",
    pdf: "*-flowchart.pdf",
  },
  auth: "Authorization: Bearer <shared Supabase access token>",
  library: {
    list: "GET /api/library",
    read: "GET /api/library/{id}",
    create: "POST /api/library",
    update: "PUT /api/library/{id}",
    delete: "DELETE /api/library/{id}",
    pdf: "GET /api/library/{id}/pdf",
  },
  builderApi: {
    sops: "GET /api/flowchart-studio/sops",
    steps: "GET /api/flowchart-studio/sops/{sopId}/steps",
    attach: "POST /api/flowchart-studio/attach",
  },
  attach: {
    placementOwnStep: OWN_STEP_PLACEMENT,
    placementExistingStep: EXISTING_STEP_PLACEMENT,
    view: ATTACH_VIEW,
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
  cors: {
    allowOrigin: "https://builder.sopmojo.com",
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    headers: "Content-Type, Authorization",
  },
  print: {
    orientation: "landscape" as const,
    page: "letter",
    flow: "LR",
    continuation: "edge-arrow" as const,
    css: "@page { size: letter landscape; margin: 0.4in; }",
  },
} as const;
