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

-- Hashed download tokens for private PDFs. The plaintext token is never stored.
-- Service role only. No policies for anon or authenticated.
create table if not exists public.pay_download_grants (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  product_id text not null,
  session_id text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  download_count integer not null default 0,
  max_downloads integer not null default 10,
  revoked_at timestamptz
);

create index if not exists pay_download_grants_email_product
  on public.pay_download_grants (email, product_id);

alter table public.pay_download_grants enable row level security;
