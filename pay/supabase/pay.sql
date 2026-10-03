-- Pay catalog, Stripe event idempotency, and credential-email claims.
-- Run on the shared Builder Supabase project (same project as public.entitlements).
-- Service role only. No policies for anon or authenticated.

create table if not exists public.pay_catalog (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pay_stripe_events (
  event_id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pay_credential_sends (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.pay_catalog enable row level security;
alter table public.pay_stripe_events enable row level security;
alter table public.pay_credential_sends enable row level security;
