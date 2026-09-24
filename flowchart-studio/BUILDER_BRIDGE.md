# Flowchart Studio → Builder Pro contract

This repo owns the **export payload**, **PNG**, **handoff URLs**, **send query**, and **print CSS**. Builder (`mojo-sop-builder` / builder.sopmojo.com) owns ingest UI (PR #3: drop JSON onto a step; landscape L→R print for attached maps).

Canonical constants live in `lib/builder-bridge.ts`.

## Seamless Send URL

`https://builder.sopmojo.com/?import=flowchart&attach=step&flowchartJson={url}&flowchartImage={url}&flowchartTitle={title}&step={n}`

| Query | Required | Meaning |
| --- | --- | --- |
| `import` | yes | `flowchart` |
| `flowchartJson` | yes (Send) | URL of the **v1** `sop-builder-pro-import` package. CORS: `GET` from `https://builder.sopmojo.com` |
| `flowchartImage` | when PNG exists | Preview / step-embed PNG URL. Same CORS |
| `flowchartTitle` | recommended | Map title |
| `step` | no | 1-based Builder SOP step to attach onto |
| `attach` | no | `step` — attach onto a Builder step |

Handoff URLs are minted by `POST /api/handoff` and live ~30 minutes:

- `GET /api/handoff/{id}` → v1 JSON
- `GET /api/handoff/{id}/image` → PNG

CORS headers:

```
Access-Control-Allow-Origin: https://builder.sopmojo.com
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

If the handoff POST fails, Send still downloads `*-builder-import.json` (+ PNG) so the user can drop the file onto a step.

## v1 JSON package (`sop-builder-pro-import`)

```json
{
  "format": "sop-builder-pro-import",
  "version": 1,
  "source": "flowchart-studio",
  "host": "https://flowchart.sopmojo.com",
  "generatedAt": "ISO-8601",
  "title": "Process title",
  "purpose": "Process with N mapped steps from Flowchart Studio.",
  "steps": [
    {
      "number": 1,
      "title": "Short label",
      "instruction": "Full instruction or decision branches",
      "kind": "start | step | decision | end",
      "decision": { "question": "…?", "branches": [{ "label": "yes", "next": "…" }] },
      "next": "Next step label"
    }
  ],
  "flowchart": { "title": "…", "nodes": [], "edges": [] }
}
```

The optional v2 download adds `print`, `attach`, and `attachments.flowchartPng`. Builder should ignore unknown fields.

## Shared print parameters

- Page: US Letter landscape
- Margin: 0.4in
- Flow: left → right happy path; No branches drop down
- Do not split a shape across pages; break mid-connector only
- Continuation chips: `cont →` / `← cont`; rare reverse edge: `← backtrack`
- Numbered write-up of steps on the first or last page
- CSS: `@page { size: letter landscape; margin: 0.4in; }`
