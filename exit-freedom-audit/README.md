# Ops Scalability Score

Canonical host (not wired in this repo): **https://audit.sopmojo.com**

**Ops Scalability Score** (Ops Audit) is SOP Mojo’s free operations audit. An operations leader answers from memory, sees a 0–100 score and the two gaps to fix first, then unlocks six directional reads with an email. They can request a call to discuss documenting the workflows.

This app lives in `/exit-freedom-audit` so it can be its own Vercel project. Do not point DNS at `audit.sopmojo.com` until you mean to. Preview deployments are enough.

Parent: https://www.sopmojo.com  
Writer: https://writer.sopmojo.com  
Studio: https://flowchart.sopmojo.com  
Builder: https://builder.sopmojo.com  
Builder Pro checkout: https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left

## Local development

```bash
cd exit-freedom-audit
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open http://localhost:3000.

```bash
npm test
npm run lint
npm run build
```

Without `MAILCHIMP_API_KEY`, a valid email still unlocks the report. The yellow ribbon does not mention Mailchimp. Without `CALL_REQUEST_TO` or `RESEND_API_KEY`, **Request a call** still shows the form and returns a clear error. Nothing is sent.

## Quiz

1. Landing. The promise is specific: coverage, a buyer, and new help all stall when the work is only in someone's head. It does not invent a valuation.
2. Goal (not scored): exit, kids/family, absentee, or less chaos.
3. Eight core questions you can answer from memory in a few seconds. None of them ask you to call staff or hunt through files.
4. Two add-on questions for the goal you picked.
5. Eleven questions total, with a progress bar.

Scoring is local. The headline is 0–100 from the ten scored answers.

| Score | Band |
| --- | --- |
| 0–39 | Fragile — key-person dependent |
| 40–69 | Building — not yet scalable |
| 70–100 | Ready — can run without you |

The two weakest areas stay readable before email. When documentation or handoffs score below 70, the report also surfaces an AI-readiness gap: document first, then automate. Sellability, ops readiness, AI implementation readiness, peer band, buyer diligence risk, and absentee run-rate are computed with the score and shown only after unlock.

Sellability is a **directional band** (lower / middle / higher). It is labeled as an estimate. It is not a valuation and it is not an industry multiple.

## Email unlock

`POST /api/capture` with `{ email, goal }`.

- A malformed email returns 400 and does not unlock.
- A valid email upserts that address on the Mailchimp audience and applies tag `audit` plus one goal tag: `audit_exit`, `audit_family`, `audit_absentee`, or `audit_chaos`.
- This is email-only. It does not use a signed-in Bearer token.
- If `MAILCHIMP_API_KEY` is missing, or Mailchimp errors, the route still unlocks (same fail-soft idea as AI SOP Writer). The response includes `mailchimp.skipped` or `mailchimp.reason`.
- The browser stores the unlock in `localStorage` (`efa-unlock-v1`). Refresh and retake keep the metrics open on this device. Retake clears the answers and, if the goal changed, tags the same email again.

## Request a call

`POST /api/call-request` with the lead’s email, optional name and note, and the score summary when the report is open.

The message says they want to discuss how SOP Mojo can help document their workflows, then includes the score summary when one was sent. Reply-To is the lead. The To address is only `CALL_REQUEST_TO` (or `MEETING_REQUEST_TO`). The server does not invent an inbox.

If `CALL_REQUEST_TO` is unset, the route returns 503: “Call requests are not configured yet. Nothing was sent.” If Resend is unset, it returns a clear error and does not send. A Resend failure returns 502. The form stays on the page either way.

The results page still links Writer, then Studio, then Builder Pro.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `MAILCHIMP_API_KEY` | No | Server-only. Upserts the unlock email and tags `audit` plus the goal tag. Unset or failing Mailchimp does not block unlock. Key looks like `<secret>-us21`. |
| `MAILCHIMP_AUDIENCE_ID` | No | Defaults to `7c2226f741` (Mojo Business Solutions LLC). |
| `RESEND_API_KEY` | Only for Request a call | Server-only. The call form returns an error when this is missing. |
| `CALL_REQUEST_TO` | Only for Request a call | Inbox that receives the request (Ryan or the Mojo inbox). If unset, the form stays up and nothing is sent. `MEETING_REQUEST_TO` is an alias. |
| `EMAIL_FROM` | No | From header. Defaults to `SOP Mojo <onboarding@resend.dev>`. Production should use a verified domain, for example `SOP Mojo <audit@sopmojo.com>`. The Resend sandbox sender can only deliver to the Resend account email until a domain is verified. |

Do not commit secret values.

Full end-to-end capture needs `MAILCHIMP_API_KEY`. Delivering a call request needs `RESEND_API_KEY` and `CALL_REQUEST_TO` on the Vercel project. The quiz, score, blur, and unlock UI work without them.

## Preview deploy

Create a Vercel project from this monorepo:

1. Framework: Next.js.
2. Root Directory: `exit-freedom-audit`.
3. Build command: `npm run build` (default). Install command: `npm install` (default).
4. Set the environment variables above for Preview and Production.
5. Deploy a preview. Leave `audit.sopmojo.com` off the project until DNS is an intentional, separate step.

## SEO and AI findability

Canonical host for titles, Open Graph, Twitter cards, sitemap URLs, and JSON-LD: **https://audit.sopmojo.com**.

Indexable pages (server-rendered HTML, one H1 each):

| URL | Role |
| --- | --- |
| `/` | Landing. The quiz starts here and is not a separate URL. |
| `/score` | Results teaser: bands and the six directional reads. Not a visitor’s private score. |
| `/faq` | Plain answers, including FAQPage JSON-LD. |

There are no per-question quiz routes. The in-progress quiz and a personal result stay on `/` as client state, so crawlers receive the landing document for that URL.

Also served:

| URL | Role |
| --- | --- |
| `/robots.txt` | Allows all major search crawlers and AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, and others). No `Disallow`. |
| `/sitemap.xml` | `/`, `/score`, `/faq` with `loc`, `lastmod`, `changefreq`, `priority`. |
| `/llms.txt` | Short description: what it is, who it is for, URL, how it works, CTA. |
| `/llms-full.txt` | Same, plus bands, the six reads, and the FAQ answers. |
| `/opengraph-image` and `/twitter-image` | Shared card for Open Graph and Twitter. |

JSON-LD on the indexable pages: `Organization` (SOP Mojo), `WebApplication` (the score), and `WebPage`. `/faq` also emits `FAQPage`.

### Target keywords

Use these in titles, headings, and citations. Do not add extra doorway URLs for them.

- business operations audit
- exit readiness
- ops scalability
- ops scalability score
- AI readiness for SMBs
- exit freedom readiness
- SOP Mojo

Entity to cite: **SOP Mojo**, **https://audit.sopmojo.com**, a free ops and exit readiness score for operations teams and leaders (ops managers, team leads, and anyone who owns how work runs).

### Follow-up

Internal links from https://www.sopmojo.com (the Framer marketing site) are out of scope for this app. Add them on sopmojo.com when you point DNS at the audit host.

## Stack

Next.js App Router, TypeScript, Tailwind CSS. Scoring, capture, the call request, and the discovery files are covered by `npm test`.
