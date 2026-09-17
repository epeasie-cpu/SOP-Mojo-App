# Client Systems

Canonical host: **https://clients.sopmojo.com**

**Client Systems** is the SOP Mojo product workspace for the Client Systems Kit. Buyers run client onboarding in the browser: intake, sales-to-delivery handoff, access SLAs, and the 31-task Kanban. It is not Notion, not ClickUp, and not “duplicate an Airtable.”

This app lives in `/client-systems` so **AI SOP Writer** (`/ai-sop-writer`) and the Streamlit AUP Engine at the repository root stay untouched.

Parent: https://www.sopmojo.com  
Related: https://writer.sopmojo.com · https://builder.sopmojo.com  
Founder contact: ryan@sopmojo.com

## Local development

```bash
cd client-systems
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

`prisma db push` uses `DATABASE_URL` (default SQLite `file:./dev.db`, created next to `prisma/schema.prisma`).

```bash
npm test
npm run build
npm start
```

Open http://localhost:3000. Create a workspace at `/signup`, add a project from intake, complete handoff (account lead + delivery lead), then open `/board`.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite `file:./dev.db` locally. Postgres URL (Supabase/Neon) in production. |
| `AUTH_SECRET` | Yes in production | HMAC secret for the session cookie. Generate with `openssl rand -base64 32`. |
| `CRON_SECRET` | No | Bearer token for `GET /api/cron/escalate`. |
| `WORKSPACE_SLACK_WEBHOOK` | No | Fallback Slack incoming-webhook URL if the workspace setting is empty. |

Auth is a lightweight httpOnly JWT cookie plus bcrypt on `User`. Each buyer signup creates one `Workspace` and an `OWNER` membership. Invited emails (workspace settings, one per line) join that workspace on signup instead of opening a second account workspace.

## Automations (v1, in-app — no Make required)

- **Handoff Complete** — both AE and delivery confirm → status Complete → seed 31 Blueprint A tasks (`lib/seed-tasks.ts`) → generate a copyable welcome draft.
- **Access SLA overdue** — Later/unreceived items past `slaDeadline` create a `BLOCKED` task for the account lead and mark `escalationSent`. Runs on project page load and on the daily cron.
- **Brand kit Later** — SLA is kickoff + 3 days.
- **Slack** — optional POST to the workspace webhook (or `WORKSPACE_SLACK_WEBHOOK`).

## SEO

Same bar as AI SOP Writer. Marketing pages are App Router server components. One registry (`lib/content.ts`) drives titles, copy, XML sitemaps, and the scrapable content tree.

Per-page `<title>` pattern: `{keyword} | Client Systems | SOP Mojo`, plus unique meta description, canonical, Open Graph, Twitter, and robots index/follow.

JSON-LD (`Organization`, `WebSite` + `SearchAction`, `SoftwareApplication`, plus `FAQPage`, `HowTo`, and `BreadcrumbList` where relevant) is emitted from the same registry.

| URL | Role |
| --- | --- |
| `/robots.txt` | Allows crawlers; disallows `/app`, `/login`, `/signup`, `/api`; `Sitemap: https://clients.sopmojo.com/sitemap.xml` |
| `/sitemap.xml` | Sitemap index |
| `/sitemap-pages.xml` | Marketing pages (`loc`, `lastmod`, `changefreq`, `priority`) |
| `/content-tree.xml` | Scrapable tree: `loc`, `title`, `description`, `type`, `parent`, `lastmod` |
| `/sitemap` | HTML sitemap |
| `/llms.txt` | LLM-oriented site summary |
| `/search?q=` | `SearchAction` target (noindex) |

Indexed v1 landings: `/`, `/client-onboarding-checklist`, `/client-proposal-template`, `/client-welcome-pack`, `/client-intake-form`, `/agency-client-onboarding`, `/how-it-works`, `/pricing`, `/faq`.

`/app` routes remain `noindex`. Canonical URLs always use `https://clients.sopmojo.com`.

Pricing copy is soft: Client Systems Kit is **$39**; the workspace is where you run the kit. No invented seat counts or discounts.

## Vercel

Create a Vercel project with **root directory** `client-systems`.

1. Set `DATABASE_URL` to a Postgres connection string (Supabase or Neon).
2. Set `AUTH_SECRET`.
3. Optional: `CRON_SECRET`, `WORKSPACE_SLACK_WEBHOOK`.
4. Build command: `npm run build` (runs `prisma generate` then `next build`).
5. After first deploy, run `npx prisma db push` against production (or `prisma migrate deploy` once you add migrations). The build script switches the Prisma `provider` to `postgresql` when `DATABASE_URL` starts with `postgres`.

### Domain (same pattern as Writer)

- Canonical: `clients.sopmojo.com`
- In the domain registrar, add a **CNAME** `clients` → `cname.vercel-dns.com` (or the target Vercel shows).
- In Vercel: Project → Domains → add `clients.sopmojo.com`.

Cron: `vercel.json` calls `/api/cron/escalate` daily at 14:00 UTC. Send `Authorization: Bearer $CRON_SECRET` if that env is set.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Prisma (SQLite locally, Postgres in production).
