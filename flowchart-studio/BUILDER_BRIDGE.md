# Flowchart Studio → Builder Pro contract

This repo owns the **export payload**, **PNG**, **send URL**, and **print CSS**. Builder (`mojo-sop-builder` / builder.sopmojo.com) owns ingest UI.

Canonical constants live in `lib/builder-bridge.ts`.

## Send URL

`https://builder.sopmojo.com/?utm_source=flowchart-studio&utm_medium=product&utm_campaign=send_to_builder&import=flowchart&attach=step`

| Query | Value | Meaning |
| --- | --- | --- |
| `import` | `flowchart` | Incoming package is a Flowchart Studio export |
| `attach` | `step` | Attach the flowchart image onto the **current / selected Builder SOP step** |

## Files

| File | Pattern | Role |
| --- | --- | --- |
| JSON | `*-builder-import.json` | Full import package (download + optional drop) |
| PNG | `*-flowchart.png` | Step embed image (`attach.imageRole = builder-step-embed`) |

## JSON package (`sop-builder-pro-import` v2)

```json
{
  "format": "sop-builder-pro-import",
  "version": 2,
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
  "flowchart": { "title": "…", "nodes": [], "edges": [] },
  "print": {
    "orientation": "landscape",
    "page": "letter",
    "flow": "LR",
    "css": "@page { size: letter landscape; margin: 0.4in; }"
  },
  "attach": {
    "target": "builder-step",
    "imageRole": "builder-step-embed",
    "imageFilename": "process-title-flowchart.png"
  },
  "attachments": {
    "flowchartPng": "data:image/png;base64,…"
  }
}
```

`attachments.flowchartPng` is present when the canvas PNG export succeeds. Always honor `attach.imageFilename` if the user also downloads a sidecar PNG.

## Builder follow-up (other repo)

1. On load, if `import=flowchart` and `attach=step`, open the step-attachment ingest.
2. Accept a dropped / uploaded `*-builder-import.json`.
3. Set the target SOP step image from `attachments.flowchartPng` or the sidecar PNG.
4. Keep a copy of the JSON as a step attachment.
5. When printing from Builder, reuse the same print contract: letter **landscape**, L→R, `@page { size: letter landscape; margin: 0.4in; }`. Do not re-paginate with portrait CSS.

## Shared print parameters

- Page: US Letter landscape
- Margin: 0.4in
- Flow: left → right happy path; No branches drop down
- Do not split a shape across pages; break mid-connector only
- Continuation chips: `cont →` / `← cont`; rare reverse edge: `← backtrack`
- Numbered write-up of steps on the first or last page
