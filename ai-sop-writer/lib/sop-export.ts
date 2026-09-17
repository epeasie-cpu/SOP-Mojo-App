import type { SopDraft } from "./sop";
import { SITE } from "./site";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "sop";
}

export function sopFilename(sop: SopDraft, ext: string): string {
  return `${slugify(sop.title)}.${ext}`;
}

export function sopToMarkdown(sop: SopDraft): string {
  const tools = sop.tools.map((tool) => `- ${tool}`).join("\n");
  const steps = sop.steps
    .map((step) => `${step.number}. **${step.title}** — ${step.detail}`)
    .join("\n");
  const bullets = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
  return `# ${sop.title}

> ${SITE.banner}

## Purpose
${sop.purpose}

## Owner
${sop.owner}

## Trigger
${sop.trigger}

## Tools
${tools}

## KPI
${sop.kpi}

## Steps
${steps}

## Exceptions
${bullets(sop.exceptions)}

## Checklist
${bullets(sop.checklist)}

## Safety notes
${bullets(sop.safetyNotes)}

---
Drafted with ${SITE.name} (${SITE.host}). Living system: ${SITE.builder}.
`;
}

export function sopToPrintHtml(sop: SopDraft): string {
  const li = (items: string[]) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const steps = sop.steps
    .map(
      (step) =>
        `<li><strong>${escapeHtml(step.title)}</strong> — ${escapeHtml(step.detail)}</li>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(sop.title)}</title>
  <style>
    body { font-family: Georgia, serif; color: #12150f; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.8rem; }
    .banner { background: #fff6c2; border: 1px solid #e0c35a; padding: 0.75rem 1rem; }
    h2 { margin-top: 1.5rem; font-size: 1.1rem; }
  </style>
</head>
<body>
  <p style="letter-spacing:0.12em;text-transform:uppercase;font-size:0.75rem;">${escapeHtml(SITE.name)}</p>
  <h1>${escapeHtml(sop.title)}</h1>
  <p class="banner">${escapeHtml(SITE.banner)}</p>
  <h2>Purpose</h2><p>${escapeHtml(sop.purpose)}</p>
  <h2>Owner</h2><p>${escapeHtml(sop.owner)}</p>
  <h2>Trigger</h2><p>${escapeHtml(sop.trigger)}</p>
  <h2>Tools</h2><ul>${li(sop.tools)}</ul>
  <h2>KPI</h2><p>${escapeHtml(sop.kpi)}</p>
  <h2>Steps</h2><ol>${steps}</ol>
  <h2>Exceptions</h2><ul>${li(sop.exceptions)}</ul>
  <h2>Checklist</h2><ul>${li(sop.checklist)}</ul>
  <h2>Safety notes</h2><ul>${li(sop.safetyNotes)}</ul>
  <p><small>Drafted with ${escapeHtml(SITE.name)}. Review with the process owner before you train anyone.</small></p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
