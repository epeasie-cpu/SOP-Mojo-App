import { isEmail, parseSopDraft, resolveEmailFrom, type SendSopEmail, type SopEmailMessage } from "./email-sop";
import { mailchimpSettings, tagAudienceMember, type CaptureResult } from "./mailchimp";
import { consumeRateLimit } from "./rate-limit";
import { SITE, STARTER_KIT_URL, WRITER_UPGRADE_URL, emailFooterLines } from "./site";
import type { SopDraft } from "./sop";
import { sopFilename, sopToMarkdown, sopToPrintHtml } from "./sop-export";
import type { ContentEntry } from "./content";
import { getTemplate } from "./templates";

const MAX_PAYLOAD = 120_000;
const NAME_RE = /^[\p{L}][\p{L}\p{M}'’.\- ]{0,39}$/u;

export type TemplateLeadResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export type ParsedTemplateLead = {
  firstName: string;
  email: string;
  slug: string;
  template: ContentEntry;
  draft?: SopDraft;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function parseFirstName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\r\n]+/g, " ").trim();
  if (!NAME_RE.test(trimmed)) return null;
  return trimmed;
}

export function parseTemplateLeadRequest(body: unknown): ParsedTemplateLead | { error: string } {
  if (!body || typeof body !== "object") return { error: "Missing template request." };
  if (JSON.stringify(body).length > MAX_PAYLOAD) return { error: "That request is too large to email." };
  const record = body as Record<string, unknown>;
  if (typeof record.company_website === "string" && record.company_website.trim()) {
    return { error: "Invalid request." };
  }
  const firstName = parseFirstName(record.firstName);
  if (!firstName) return { error: "Enter your first name." };
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  if (!isEmail(email)) return { error: "Enter a valid email." };
  const slug = typeof record.slug === "string" ? record.slug.trim() : "";
  const template = getTemplate(slug);
  if (!template?.mcTag) return { error: "Unknown template." };
  if (record.draft === undefined || record.draft === null) {
    return { firstName, email, slug, template };
  }
  const draft = parseSopDraft(record.draft);
  if (!draft) return { error: "That draft could not be attached." };
  return { firstName, email, slug, template, draft };
}

export function templateToDraft(entry: ContentEntry): SopDraft {
  const tools = entry.prefill?.tools
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? ["Tools named when you draft your version"];
  return {
    title: entry.heading,
    purpose: entry.purpose ?? entry.lede ?? entry.description,
    owner: (entry.roles ?? [entry.prefill?.role ?? "Process owner"]).join("; "),
    trigger: entry.prefill?.trigger ?? "",
    tools,
    kpi: entry.prefill?.kpi ?? "",
    steps: (entry.templateSteps ?? []).map((step, index) => ({
      number: index + 1,
      title: step.step,
      detail: [step.owner, step.standard].filter(Boolean).join(". "),
    })),
    exceptions: entry.exceptions ?? [],
    checklist: entry.checklist ?? [],
    safetyNotes: [entry.records, entry.reviewCadence].filter((item): item is string => Boolean(item)),
  };
}

function templateMarkdown(entry: ContentEntry): string {
  const base = sopToMarkdown(templateToDraft(entry)).trimEnd();
  const customize = (entry.customize ?? []).map((item) => `- ${item}`).join("\n");
  const extras = (entry.extraLists ?? [])
    .map((list) => `## ${list.heading}\n${list.items.map((item) => `- ${item}`).join("\n")}`)
    .join("\n\n");
  return [
    base,
    extras,
    `## Records and sign-off\n${entry.records ?? ""}`,
    `## Review cadence\n${entry.reviewCadence ?? ""}`,
    customize ? `## What to customize\n${customize}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function templateHtml(entry: ContentEntry): string {
  const extra = [
    entry.records
      ? `<h2>Records and sign-off</h2><p>${escapeHtml(entry.records)}</p>`
      : "",
    entry.reviewCadence
      ? `<h2>Review cadence</h2><p>${escapeHtml(entry.reviewCadence)}</p>`
      : "",
  ].join("");
  return sopToPrintHtml(templateToDraft(entry)).replace("</body>", `${extra}</body>`);
}

function fileSlug(entry: ContentEntry): string {
  return entry.slug || "sop-template";
}

export function buildTemplateEmail(input: {
  to: string;
  firstName: string;
  template: ContentEntry;
  draft?: SopDraft;
  from: string;
  env: NodeJS.ProcessEnv;
}): SopEmailMessage {
  const title = input.template.heading.replace(/[\r\n]+/g, " ").slice(0, 120);
  const markdown = templateMarkdown(input.template);
  const htmlFile = templateHtml(input.template);
  const footer = emailFooterLines(input.env);
  const upsell = `When the process owner has reviewed it, assign an owner and keep revisions in Builder Pro: ${WRITER_UPGRADE_URL}`;
  const kit = `SOP Starter Kit: ${STARTER_KIT_URL}`;
  const draftNote = input.draft ? "Your generated draft is attached as well." : "";
  const text = [
    `Hi ${input.firstName},`,
    "",
    `Here is the ${title} from ${SITE.name}. The template is attached as Markdown and as a Word-ready HTML file.`,
    ...(draftNote ? ["", draftNote] : []),
    "",
    markdown.trim(),
    "",
    upsell,
    kit,
    "",
    ...footer,
    "",
    "Review it with the process owner before you train anyone.",
    SITE.host,
  ].join("\n");
  const html = `<p>Hi ${escapeHtml(input.firstName)},</p>
<p>Here is the <strong>${escapeHtml(title)}</strong> from ${escapeHtml(SITE.name)}. The template is attached as Markdown and as a Word-ready HTML file.</p>
${draftNote ? `<p>${escapeHtml(draftNote)}</p>` : ""}
<pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(markdown.trim())}</pre>
<p>${escapeHtml(upsell)}</p>
<p><a href="${escapeHtml(STARTER_KIT_URL)}">${escapeHtml(kit)}</a></p>
<p>${footer.map((line) => escapeHtml(line)).join("<br>")}</p>
<p>Review it with the process owner before you train anyone.</p>
<p><a href="${SITE.host}">${SITE.host.replace("https://", "")}</a></p>`;
  const attachments: SopEmailMessage["attachments"] = [
    {
      filename: `${fileSlug(input.template)}.md`,
      content: Buffer.from(markdown, "utf8").toString("base64"),
      contentType: "text/markdown; charset=utf-8",
    },
    {
      filename: `${fileSlug(input.template)}.html`,
      content: Buffer.from(htmlFile, "utf8").toString("base64"),
      contentType: "text/html; charset=utf-8",
    },
  ];
  if (input.draft) {
    const draftMarkdown = sopToMarkdown(input.draft);
    attachments.push({
      filename: `your-draft-${sopFilename(input.draft, "md")}`,
      content: Buffer.from(draftMarkdown, "utf8").toString("base64"),
      contentType: "text/markdown; charset=utf-8",
    });
  }
  return {
    from: input.from,
    to: input.to,
    subject: `Your ${title}`,
    text,
    html,
    attachments,
  };
}

async function tagTemplateLead(input: {
  email: string;
  firstName: string;
  mcTag: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  try {
    return await tagAudienceMember({
      email: input.email,
      tags: ["writer", "template", input.mcTag],
      mergeFields: { FNAME: input.firstName },
      settings,
      fetchImpl: input.fetchImpl,
    });
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function deliverTemplateLead(input: {
  body: unknown;
  env: NodeJS.ProcessEnv;
  ip?: string;
  now?: number;
  fetchImpl?: typeof fetch;
  send?: SendSopEmail;
}): Promise<TemplateLeadResult> {
  if (input.ip && !consumeRateLimit(`template-lead:${input.ip}`, input.now)) {
    return { ok: false, error: "Too many requests. Try again later.", status: 429 };
  }
  const parsed = parseTemplateLeadRequest(input.body);
  if ("error" in parsed) return { ok: false, error: parsed.error, status: 400 };

  const message = buildTemplateEmail({
    to: parsed.email,
    firstName: parsed.firstName,
    template: parsed.template,
    draft: parsed.draft,
    from: resolveEmailFrom(input.env),
    env: input.env,
  });
  const send = input.send ?? (async () => ({ ok: false }));
  const [sent, tagged] = await Promise.all([
    send(message).catch(() => ({ ok: false })),
    tagTemplateLead({
      email: parsed.email,
      firstName: parsed.firstName,
      mcTag: parsed.template.mcTag as string,
      env: input.env,
      fetchImpl: input.fetchImpl,
    }),
  ]);
  if (!tagged.ok && !tagged.skipped) {
    console.error("template-lead mailchimp tag failed", tagged.reason);
  }
  if (!sent.ok) {
    return {
      ok: false,
      error: "We couldn't send that template. Check the address and try again.",
      status: 502,
    };
  }
  return { ok: true };
}
