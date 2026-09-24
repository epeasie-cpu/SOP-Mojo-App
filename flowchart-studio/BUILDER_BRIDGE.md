# Flowchart Studio → Builder Pro contract

This matches Builder PR #5 (`cursor/flowchart-attach-pdf-f782`). Studio could not read that private repo from this environment, so the shapes below follow the contract named on that PR: table `public.flowchart_maps`, and `/api/studio/*`.

Canonical constants live in `lib/builder-bridge.ts`.

## Auth

Sign in against Builder's Supabase project (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

Every Builder call and every map write sends:

```
Authorization: Bearer <Supabase access token>
```

PostgREST also sends `apikey: <anon key>`. Studio does **not** use the service role. RLS is `user_id = auth.uid()`, so the write sets `user_id` to that user.

Unauthenticated export or save opens the sign-in prompt.

## Persistence

Table: `public.flowchart_maps`

Builder migration: `database/migrations/20260924_flowchart_library_and_placement.sql`

Upsert with the user JWT:

`POST {SUPABASE_URL}/rest/v1/flowchart_maps?on_conflict=id`

`Prefer: resolution=merge-duplicates,return=representation`

| Column | Value |
| --- | --- |
| `id` | UUID |
| `user_id` | `auth.uid()` |
| `title` | Map title |
| `purpose` | Short purpose line |
| `graph` | `{ "title", "nodes", "edges" }` |
| `image_url` | Optional. Studio sends `null` until a hosted preview exists |
| `document` | Optional jsonb. Studio sends `{ "source": "flowchart-studio", "print": { ... } }` |

List and delete use the same user JWT (`GET` / `DELETE` on that table). RLS returns only the caller's rows.

The PDF is not stored in the row. Studio builds it with `lib/print-pdf.ts` (same pagination as print: letter landscape, 0.4in margin, dense boxes, edge-arrow continuation, vertically centered) and sends it on attach.

## Export wizard

1. Upsert the current map.
2. “Which SOP would you like to export this to?” — `GET {BUILDER}/api/studio/sops`
3. “Which step would you like to add it to?” — includes **Its Own Step**, then `GET {BUILDER}/api/studio/sops/{sopId}/steps`

`{BUILDER}` defaults to `https://builder.sopmojo.com`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/studio/sops` | `{ sops: [{ id, title }] }` |
| `GET` | `/api/studio/sops/{sopId}/steps` | `{ steps: [{ id, title, number? }] }` |
| `POST` | `/api/studio/attach` | Attach this map |

### Attach body

```json
{
  "sopId": "sop-id",
  "placement": "own",
  "stepId": null,
  "flowchartId": "uuid",
  "title": "Process title",
  "purpose": "Process with N mapped steps from Flowchart Studio.",
  "graph": { "title": "Process title", "nodes": [], "edges": [] },
  "pdfBase64": "…",
  "pdfFilename": "process-title-flowchart.pdf"
}
```

`placement` is `own` (Its Own Step, `stepId` null) or `step` (existing step, `stepId` set).

### Attach response

```json
{
  "stepId": "step-id",
  "placement": "own",
  "pdfUrl": "https://builder.sopmojo.com/…",
  "printable": {}
}
```

`placement` is `own` or `step`. `printable` is the printable payload. `pdfUrl` is what a click should open.

- **own**: a step whose view is “Flowchart, click to open”, not an inline timeline map.
- **step**: the existing step gains a flowchart attachment. Click opens the same PDF.

## Deprecated auto-spawn link

Do not open this as the export path:

`https://builder.sopmojo.com/?import=flowchart&attach=step&flowchartJson={url}&flowchartImage={url}&flowchartTitle={title}&step={n}`

That query used a short-lived handoff and auto-created a step. Export no longer does that.

## Shared print parameters

- Page: US Letter landscape
- Margin: 0.4in
- Flow: left → right; No branches drop down
- Continuation: edge arrow to the paper edge. No Cont / backtrack pills.
- Dense print boxes
- Sheet content centered vertically
- Numbered steps on the last page
- CSS: `@page { size: letter landscape; margin: 0.4in; }`
- PDF generator: `lib/print-pdf.ts`
