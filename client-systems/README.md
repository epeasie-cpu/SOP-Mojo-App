# Client Systems

Canonical host: **https://clients.sopmojo.com**

**Client Systems** is the SOP Mojo workspace for the client path after yes: proposal → welcome → onboard. Buyers run intake, sales-to-delivery handoff, access SLAs, and the 31-task board in the browser. It is **not** AI SOP Writer, **not** a Notion template marketplace, and **not** ClickUp.

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

`prisma db push` uses `DATABASE_URL` (default SQLite `file:./dev.db`, created next to `prisma/schema.prisma`). Production is a **dedicated Supabase** project — see [MIGRATION.md](MIGRATION.md). Do not use Neon. Do not reuse Builder’s Supabase project.

```bash
npm test
npm run build
npm start
```

Open http://localhost:3000. Create a workspace at `/signup`, add a project from intake, complete handoff (account lead + delivery lead), then open `/board`.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite `file:./dev.db` locally. Dedicated Client Systems Supabase **transaction** pooler (`:6543?pgbouncer=true`) in production. |
| `DIRECT_URL` | Production | Dedicated Supabase **session** pooler (`:5432`) for `prisma db push` / migrate. |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Dedicated project URL. Not Builder. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Dedicated project `anon` key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Dedicated project `service_role`. Server-only. |
| `AUTH_SECRET` | Yes in production | HMAC secret for the session cookie. Generate with `openssl rand -base64 32`. |
| `CRON_SECRET` | No | Bearer token for `GET /api/cron/escalate`. |
| `WORKSPACE_SLACK_WEBHOOK` | No | Fallback Slack incoming-webhook URL if the workspace setting is empty. |
| `NEXT_PUBLIC_KIT_CHECKOUT_URL` | No | Live kit checkout. Empty or `#` keeps **Get the $39 Kit** as a placeholder. Product+Offer JSON-LD on `/client-systems-kit` is emitted only when this is a real URL. |

Auth is a lightweight httpOnly JWT cookie plus bcrypt on `User`. Each buyer signup creates one `Workspace` and an `OWNER` membership. Invited emails (workspace settings, one per line) join that workspace on signup instead of opening a second account workspace.

## Automations (v1, in-app — no Make required)

- **Handoff Complete** — both AE and delivery confirm → status Complete → seed 31 Blueprint A tasks (`lib/seed-tasks.ts`) → generate a copyable welcome draft.
- **Access SLA overdue** — Later/unreceived items past `slaDeadline` create a `BLOCKED` task for the account lead and mark `escalationSent`. Runs on project page load and on the daily cron.
- **Brand kit Later** — SLA is kickoff + 3 days.
- **Slack** — optional POST to the workspace webhook (or `WORKSPACE_SLACK_WEBHOOK`).

## SEO

Same bar as AI SOP Writer. Marketing pages are App Router server components. One registry (`lib/content.ts`) drives titles, copy, XML sitemaps, and the scrapable content tree.

Per-page `<title>` pattern: `{keyword} | Client Systems | SOP Mojo`, plus unique meta description, canonical, Open Graph, Twitter, and robots index/follow.

JSON-LD from the same registry:

- Home (`/`): `Organization`, `WebSite` + `SearchAction`, `SoftwareApplication`, `BreadcrumbList`
- `/client-onboarding-checklist`: `FAQPage`, `HowTo`, `BreadcrumbList`
- `/faq`: `FAQPage`, `BreadcrumbList`
- `/client-systems-kit`: `Product` + `Offer` only when `NEXT_PUBLIC_KIT_CHECKOUT_URL` is set; `BreadcrumbList` always
- Every indexed page: `BreadcrumbList`

| URL | Role |
| --- | --- |
| `/robots.txt` | Allows crawlers; disallows `/app`, `/login`, `/signup`, `/api`; `Sitemap: https://clients.sopmojo.com/sitemap.xml` |
| `/sitemap.xml` | Sitemap index |
| `/sitemap-pages.xml` | Marketing pages (`loc`, `lastmod`, `changefreq`, `priority`) |
| `/content-tree.xml` | Scrapable tree: `loc`, `title`, `description`, `type`, `parent`, `lastmod` |
| `/sitemap` | HTML sitemap |
| `/llms.txt` | LLM-oriented site summary |
| `/search?q=` | `SearchAction` target (noindex) |

Day-one indexed landings on https://clients.sopmojo.com:

- `/`
- `/client-onboarding`
- `/client-onboarding-checklist`
- `/client-proposal-template`
- `/client-welcome-pack`
- `/client-intake-form`
- `/sales-to-delivery-handoff`
- `/client-systems-kit`
- `/how-it-works`
- `/faq`

Permanent redirects: `/pricing` → `/client-systems-kit`, `/agency-client-onboarding` → `/client-onboarding`. Phase-two pages (meeting agenda, RACI, handbook) are not shipped.

Every landing uses the same CTA row: **Start free in Client Systems** (`/signup`), **Get the $39 Kit** (`NEXT_PUBLIC_KIT_CHECKOUT_URL` or `#`), then Writer and Builder Pro bridges.

`/app` routes remain `noindex`. Canonical URLs always use `https://clients.sopmojo.com`.

The Client Systems Kit is **$39**; the workspace is where you run it after yes. No invented seat counts or discounts.

## Vercel

Create a Vercel project with **root directory** `client-systems`.

Production database is a **dedicated Supabase** project. Ryan’s clicks, SQL, and env list: [MIGRATION.md](MIGRATION.md).

1. Set `DATABASE_URL` to that project’s transaction pooler URL (`prisma` user, port `6543`, `?pgbouncer=true`).
2. Set `DIRECT_URL` to the session pooler URL (port `5432`).
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from that project (not Builder).
4. Keep existing `AUTH_SECRET`. Optional: `CRON_SECRET`, `WORKSPACE_SLACK_WEBHOOK`, `NEXT_PUBLIC_KIT_CHECKOUT_URL`.
5. Remove any Neon `DATABASE_URL` / `NEON_*` leftovers.
6. Build command: `npm run build` (runs `prisma generate` then `next build`). The build script switches the Prisma `provider` to `postgresql` when `DATABASE_URL` starts with `postgres`, and refuses Neon hosts on **production**.
7. Apply schema with the SQL in `supabase/` (or `npm run db:push` against `DIRECT_URL`), then `supabase/0002_rls_and_prisma_role.sql`.

### Domain (same pattern as Writer)

- Canonical: `clients.sopmojo.com`
- In the domain registrar, add a **CNAME** `clients` → `cname.vercel-dns.com` (or the target Vercel shows).
- In Vercel: Project → Domains → add `clients.sopmojo.com`.

Cron: `vercel.json` calls `/api/cron/escalate` daily at 14:00 UTC. Send `Authorization: Bearer $CRON_SECRET` if that env is set.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Prisma (SQLite locally, dedicated Supabase Postgres in production).
