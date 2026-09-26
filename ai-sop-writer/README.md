# AI SOP Writer

Canonical host: **https://writer.sopmojo.com**

**AI SOP Writer** is a SOP Mojo product that writes a first-draft **standard operating procedure** (SOP — not a statement of purpose). After you generate a draft, the primary paid upgrade CTA is [Builder Pro checkout](https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left). [SOP Builder Pro](https://builder.sopmojo.com) remains the living-system product host. The launch page at https://www.sopmojo.com/lp/ai-sop-writer stays available for learn-more copy.

This app lives in `/ai-sop-writer` so the existing Streamlit AUP Engine at the repository root is left untouched.

## Product name

Use **AI SOP Writer** in the UI. Do not call this product Draft Engine, SOP Builder, or SOP Generator.

Parent: https://www.sopmojo.com  
Upgrade LP: https://www.sopmojo.com/lp/ai-sop-writer  
Living system: https://builder.sopmojo.com  
Founder contact: ryan@sopmojo.com  
Library: https://www.sopmojo.com/soplibrary

## Local development

```bash
cd ai-sop-writer
npm install
cp .env.example .env.local   # optional API keys
npm run dev
```

Open http://localhost:3000. The generator is above the fold on the home page. Without `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, drafts use the template engine and show **template mode**.

```bash
npm run build
npm start
npm test
```

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Use OpenAI for drafts when set. Unset keeps template mode. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | No | Used when OpenAI is not set. Unset, with no OpenAI key, keeps template mode. |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-3-5-haiku-latest` |
| `RESEND_API_KEY` | Yes, to copy, download, or print | Server-only. Sends the current draft with [Resend](https://resend.com). Leave actions show an error if this send fails. |
| `EMAIL_FROM` | No | From address. Defaults to `SOP Mojo Writer <onboarding@resend.dev>` for local/dev. Production should set a verified domain address, for example `SOP Mojo <writer@sopmojo.com>`. The Resend sandbox sender can only deliver to the Resend account email until a domain is verified. |
| `MAILCHIMP_API_KEY` | No | Server-only. Adds or updates the submitted email on audience `7c2226f741` with tag `writer`. A Mailchimp error does not block the email or the page. |
| `MAILCHIMP_AUDIENCE_ID` | No | Defaults to `7c2226f741` (Mojo Business Solutions LLC). |

Generate and on-page review stay free. Copy Markdown, Copy AI prompt, Download Markdown, Download print HTML, and Print open an email-only prompt: “Enter email to get your SOP in your inbox.” No password and no Supabase account are required. `POST /api/email-sop` sends the current draft with Resend and, when `MAILCHIMP_API_KEY` is set, tags that address `writer`. Print and Download print HTML attach the print-ready HTML file (open it and use Print or Save as PDF). Copy and Markdown download attach Markdown and include it in the message. After a successful send, the pending copy, download, or print runs, and further leave actions on that same draft stay available. If Resend cannot send, the modal shows an error and the leave action does not run. A Mailchimp failure is logged and does not block the send.

Set these on the Writer Vercel project: `RESEND_API_KEY`, optional `EMAIL_FROM`, and the existing `MAILCHIMP_API_KEY` / `MAILCHIMP_AUDIENCE_ID`. Do not commit secret values.

## SEO surfaces

All marketing pages are App Router server components (SSR/static HTML). Crawlers do not need a SPA shell for titles, copy, or metadata.

Per-page `<title>` pattern: `primary keyword | AI SOP Writer | SOP Mojo`, plus unique meta description, canonical, Open Graph, Twitter, and robots index/follow.

JSON-LD (`Organization`, `WebSite` + `SearchAction`, `SoftwareApplication`, plus `FAQPage`, `HowTo`, and `BreadcrumbList` where relevant) is emitted from the same content registry as the pages.

| URL | Role |
| --- | --- |
| `/robots.txt` | Allows crawlers; `Sitemap: https://writer.sopmojo.com/sitemap.xml` |
| `/sitemap.xml` | Sitemap index |
| `/sitemap-pages.xml` | Marketing pages (`loc`, `lastmod`, `changefreq`, `priority`) |
| `/sitemap-use-cases.xml` | Use-case URLs with the same tags |
| `/content-tree.xml` | Scrapable tree: `loc`, `title`, `description`, `type`, `parent`, `lastmod` |
| `/sitemap` | HTML sitemap (linked in the footer) |
| `/llms.txt` | LLM-oriented site summary |
| `/search?q=` | `SearchAction` target |

One registry drives pages and both XML sitemaps: `lib/content.ts`.

## Sitemap generation

XML is built at request/build time from `lib/content.ts` via `lib/xml.ts`. There is no separate crawl job. Canonical URLs always use `https://writer.sopmojo.com` so local previews still emit the production host for crawlers and tests.

## Stack

Next.js App Router, TypeScript, Tailwind CSS.
