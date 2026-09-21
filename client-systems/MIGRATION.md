# Dedicated Supabase for Client Systems

Ryan does this in the **Supabase dashboard** and **Vercel project `client-systems`**. This repo does **not** create the project and does **not** contain secrets.

**Do not** reuse Builder’s Supabase project. **Do not** keep the temporary Neon `DATABASE_URL`. Vertical stack is Supabase only; Client Systems gets its own project so RLS and blast radius stay isolated.

Canonical app: https://clients.sopmojo.com  
Vercel project: `client-systems` (`prj_bcnLzUc3mbhkXsiYeRSSbj5akx1b`)

## What the app actually uses

Client Systems is **not** Auth.js and **not** Supabase Auth.

| Piece | Implementation |
| --- | --- |
| Accounts | Prisma `User` + bcrypt (`lib/actions/auth.ts`) |
| Session | httpOnly JWT cookie `cs_session` (`jose` + `AUTH_SECRET`) |
| Workspaces | Prisma `Workspace` + `Membership` (one owner workspace per signup; invited emails join) |
| Sessions table | **None** — do not create Auth.js `Session` / `Account` / `VerificationToken` tables |
| Runtime database | Prisma → Postgres. On Vercel this **must** be the dedicated Supabase project |

Local and CI keep SQLite (`DATABASE_URL=file:./dev.db`). Production uses the dedicated Supabase Postgres URL. `scripts/prisma-run.mjs` switches the Prisma `provider` to `postgresql` and adds `directUrl` when `DATABASE_URL` starts with `postgres`.

`@supabase/ssr` is not wired because the existing pattern is Prisma + the JWT cookie. Adding a second auth client would split identity. The dedicated project still gets URL + anon + service-role copied into Vercel so the project is recorded and ready if we add a Supabase client later.

## 1. Create the dedicated project (Supabase dashboard)

1. Sign in at [https://supabase.com/dashboard](https://supabase.com/dashboard) on the SOP Mojo / Ryan account (not a personal throwaway if this is production).
2. **New project**.
3. Organization: SOP Mojo (same org as Builder is fine; **new project**, not Builder’s project).
4. Name: `sopmojo-client-systems` (or `client-systems`). Must be distinct from Builder.
5. Database password: generate a strong password. Save it in the password manager. You will need it for connection strings. This repo will never contain it.
6. Region: pick the region closest to the Vercel project (US East if unsure).
7. Create the project and wait until it is ready.

Confirm the project ref in the URL (`https://supabase.com/dashboard/project/<project-ref>`) is **not** Builder’s ref.

## 2. Copy API keys (placeholders only in git)

In the new project: **Project Settings → API**.

Copy (do not paste real values into the repo):

| Dashboard label | Vercel / `.env` name | Notes |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe to expose; RLS + revoke still lock tables |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never prefix `NEXT_PUBLIC_`. Not used by Prisma today |

## 3. Copy Postgres URLs (this is what the app uses)

In the same project: **Project Settings → Database → Connect** (or the **Connect** button).

Use the **shared pooler (Supavisor)**. Vercel is IPv4; the direct `db.<ref>.supabase.co` host is IPv6-only unless you buy the IPv4 add-on.

| Env | Mode | Port | Extra query |
| --- | --- | --- | --- |
| `DATABASE_URL` | Transaction pooler | `6543` | `?pgbouncer=true` |
| `DIRECT_URL` | Session pooler | `5432` | none |

After you create the `prisma` role in step 4, change the username in both URLs from `postgres` to `prisma` and use the **prisma role password** (not the dashboard `anon` key).

Placeholders (replace every bracketed token):

```text
DATABASE_URL="postgresql://prisma.[PROJECT_REF]:[PRISMA_ROLE_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://prisma.[PROJECT_REF]:[PRISMA_ROLE_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

`[REGION]` is the host prefix Supabase shows (for example `aws-0-us-east-1`). Copy the host from the dashboard; do not invent it.

Until the `prisma` role exists you may use the `postgres` user + database password once to run SQL / `db:push`, then switch both URLs to `prisma`.

## 4. Schema + RLS (SQL Editor)

**SQL Editor → New query.**

1. Paste and run [`supabase/0001_init.sql`](supabase/0001_init.sql).  
   Or, from a machine that has the URLs in `.env.local`: `cd client-systems && npm run db:push` (uses `DIRECT_URL` when set).
2. Open [`supabase/0002_rls_and_prisma_role.sql`](supabase/0002_rls_and_prisma_role.sql). Replace `REPLACE_WITH_GENERATED_PASSWORD` with a **new** password (not the project `postgres` password). Run it.
3. Update `DATABASE_URL` and `DIRECT_URL` to use user `prisma` and that password.

There is **no** sessions table to create. Signup writes `User` + `Workspace` + `Membership`.

Optional but recommended: **Project Settings → API → Data API** — turn the Data API off. This app only uses Prisma. RLS in `0002` is the backstop if the API stays on.

Do **not** enable extra Supabase Auth providers for this app. `/signup` already works via Prisma.

## 5. Vercel env vars (`client-systems` only)

Vercel → project **client-systems** → **Settings → Environment Variables**.  
Scope: Production and Preview (and Development if you pull env locally).

**Set / replace**

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Transaction pooler URL from step 3 (`prisma` user, `?pgbouncer=true`) |
| `DIRECT_URL` | Session pooler URL from step 3 |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` key from step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key from step 2 (Sensitive) |

**Keep as-is** (already on the project; do not rotate unless you mean to)

| Name | Purpose |
| --- | --- |
| `AUTH_SECRET` | HMAC for `cs_session` |
| `CRON_SECRET` | Bearer for `GET /api/cron/escalate` |

**Remove**

- The claimable / temporary **Neon** `DATABASE_URL` (and any `NEON_*` / `POSTGRES_URL` leftovers from that store).
- Any URL whose host is `*.neon.tech` or `*.neon.build`.
- Builder’s Supabase URL or keys. If they appear on this Vercel project, delete them.

Redeploy Production after saving. `npm run build` runs `prisma generate` (provider flips to `postgresql` when `DATABASE_URL` is Postgres). A Neon URL **fails production builds** on purpose; preview can still generate against the temporary Neon URL until you switch.

## 6. Verify

1. Open https://clients.sopmojo.com/signup (or the preview URL).
2. Create a workspace. You should land on `/app`.
3. In Supabase **Table Editor**, confirm rows in `"User"`, `"Workspace"`, `"Membership"`.
4. Confirm Builder’s project tables did **not** change.

Local still uses SQLite:

```bash
cd client-systems
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

To point a laptop at the dedicated project, put the pooler URLs in `.env.local` (gitignored). Never commit them.

## Why this is not `@supabase/ssr`

The working signup/login/invite path is Prisma + bcrypt + `cs_session`. Pointing `DATABASE_URL` at dedicated Supabase Postgres is the correct migration for this codebase. A Supabase Auth rewrite would replace that path and is out of scope.
