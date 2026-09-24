# Flowchart Studio → Builder Pro contract

Studio owns the map library, the printable PDF, and the export wizard. Builder (`mojo-sop-builder` / builder.sopmojo.com) owns SOP and step records. Both sides use the **same Supabase user**.

Canonical constants live in `lib/builder-bridge.ts`.

## Auth

Every library and Builder call sends:

```
Authorization: Bearer <Supabase access token>
```

Studio signs in against Builder's project (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`). The server checks that token with `GET {SUPABASE_URL}/auth/v1/user`.

Maps are stored in `public.flowchart_maps` (see `supabase/0001_flowchart_maps.sql`) when `SUPABASE_SERVICE_ROLE_KEY` is set. Row level security matches `auth.uid()::text = user_id`, so Builder can also read the table with the user JWT. The HTTP API below is the supported contract.

Unauthenticated export or save opens the sign-in prompt. It does not publish a map.

## Library API (Builder reads this)

Base: `https://flowchart.sopmojo.com`

CORS allows `https://builder.sopmojo.com` with `Authorization` and `Content-Type`.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/api/library` | — | `{ maps: LibrarySummary[] }` newest first |
| `POST` | `/api/library` | `{ graph, id? }` | `{ map: LibraryMap }` |
| `GET` | `/api/library/{id}` | — | `{ map: LibraryMap }` |
| `PUT` | `/api/library/{id}` | `{ graph }` | `{ map: LibraryMap }` |
| `DELETE` | `/api/library/{id}` | — | `204` |
| `GET` | `/api/library/{id}/pdf` | — | `application/pdf` |

`LibrarySummary`: `id`, `title`, `createdAt`, `updatedAt`, `nodeCount`, `pdfUrl`, `url`.

`LibraryMap` adds `graph` (`title`, `nodes`, `edges`).

`graph` is the canvas: nodes (`id`, `kind`, `label`, `position`), edges (`id`, `source`, `target`, optional `label`). `updatedAt` changes on every save.

The PDF is regenerated from that graph with the same pagination as studio print (`lib/print-pages.ts` + `lib/print-map.ts`): letter landscape, 0.4in margin, dense boxes, edge-arrow continuation, content centered on the sheet. No Cont pills.

## Export wizard → Builder attach API

Studio UI:

1. Save the current map for the signed-in user.
2. “Which SOP would you like to export this to?” — `GET` the SOP list.
3. “Which step would you like to add it to?” — includes **Its Own Step**, then `GET` steps.

Builder must expose these routes and accept the same Bearer token. Until they exist, Studio's proxy returns `502` with `code: "builder_contract_missing"` and the expected URL. The map stays in the library.

| Method | Builder path | Meaning |
| --- | --- | --- |
| `GET` | `/api/flowchart-studio/sops` | `{ sops: [{ id, title, updatedAt? }] }` |
| `GET` | `/api/flowchart-studio/sops/{sopId}/steps` | `{ steps: [{ id, title, number? }] }` |
| `POST` | `/api/flowchart-studio/attach` | Attach the printable PDF |

Studio calls those through same-origin `/api/builder/sops`, `/api/builder/sops/{sopId}/steps`, and `/api/builder/attach`, which forward the bearer token to `https://builder.sopmojo.com`.

### Attach body

```json
{
  "sopId": "sop-id",
  "placement": "own-step",
  "stepId": null,
  "flowchartId": "map_…",
  "title": "Process title",
  "view": "flowchart-click-to-open",
  "pdfBase64": "…",
  "pdfFilename": "process-title-flowchart.pdf",
  "pdfUrl": "https://flowchart.sopmojo.com/api/library/map_…/pdf",
  "libraryUrl": "https://flowchart.sopmojo.com/api/library/map_…"
}
```

`placement` is `own-step` or `existing-step`. For an existing step, `stepId` is that step's id. For its own step, `stepId` is `null`.

`view` is always `flowchart-click-to-open`.

### What Builder should render

- **Its Own Step** (`placement: "own-step"`): a step whose view is “Flowchart, click to open”. It is not an instruction timeline node and the map is not drawn inline. Click opens the printable PDF (`pdfBase64`, or refetch `pdfUrl` with the bearer token).
- **Existing step** (`placement: "existing-step"`): keep the step. Add a flowchart attachment icon. Click opens the same printable PDF.

Do not embed the flowchart as a timeline image and do not draw Cont / backtrack pills.

## Deprecated auto-spawn link

Do not open this as the export path:

`https://builder.sopmojo.com/?import=flowchart&attach=step&flowchartJson={url}&flowchartImage={url}&flowchartTitle={title}&step={n}`

That query used a short-lived `POST /api/handoff` payload and auto-created a step from the live Send body. Export no longer does that. The handoff routes remain only so old links can expire. New work uses the library id plus the attach body above.

File-drop of `*-builder-import.json` is unchanged for the older ingest UI.

## Shared print parameters

- Page: US Letter landscape
- Margin: 0.4in
- Flow: left → right happy path; No branches drop down
- Do not split a shape across pages; break mid-connector only
- Continuation: a flow line leaves the last shape and runs to the right paper edge, ending in an arrowhead. The next page brings a line in from the left edge into the first shape. A rare backtrack uses the opposite edge the same way. No Cont / backtrack pills.
- Print boxes hug their labels (smaller padding, type, and minimum size than the on-screen cards).
- The sheet content is centered vertically (`min-height: 7.4in`, `justify-content: center`).
- Numbered write-up of steps on the last page
- CSS: `@page { size: letter landscape; margin: 0.4in; }`
- PDF generator: `lib/print-pdf.ts` (`renderPrintPdf`)
