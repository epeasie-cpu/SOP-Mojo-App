-- Client Systems — dedicated Supabase project only (not Builder, not Neon).
-- Run AFTER tables exist (0001_init.sql or `npm run db:push`).
--
-- Auth is a JWT cookie + bcrypt on "User", not Supabase Auth and not Auth.js.
-- There is no sessions table. Prisma talks to Postgres as the `prisma` role.
--
-- Replace REPLACE_WITH_GENERATED_PASSWORD before running. Do not commit a real password.

do $$
begin
  if not exists (select from pg_roles where rolname = 'prisma') then
    create user "prisma" with password 'REPLACE_WITH_GENERATED_PASSWORD' bypassrls createdb;
  end if;
end
$$;

grant "prisma" to "postgres";

grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;

-- PostgREST (anon / authenticated) must not read client data even if the
-- Data API stays on. Prisma uses the database role and bypasses RLS.
alter table "User" enable row level security;
alter table "Workspace" enable row level security;
alter table "Membership" enable row level security;
alter table "Client" enable row level security;
alter table "Project" enable row level security;
alter table "Deliverable" enable row level security;
alter table "Task" enable row level security;
alter table "AccessItem" enable row level security;
alter table "Blocker" enable row level security;
alter table "Handoff" enable row level security;

revoke all on table "User" from anon, authenticated;
revoke all on table "Workspace" from anon, authenticated;
revoke all on table "Membership" from anon, authenticated;
revoke all on table "Client" from anon, authenticated;
revoke all on table "Project" from anon, authenticated;
revoke all on table "Deliverable" from anon, authenticated;
revoke all on table "Task" from anon, authenticated;
revoke all on table "AccessItem" from anon, authenticated;
revoke all on table "Blocker" from anon, authenticated;
revoke all on table "Handoff" from anon, authenticated;
