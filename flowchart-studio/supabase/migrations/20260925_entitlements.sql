-- Shared Flowchart Studio + Builder Pro entitlements.
-- Apply on the SAME Supabase project as Builder (builder.sopmojo.com / mojo-sop-builder),
-- the project already used for public.flowchart_maps. Do not apply this on the
-- Client Systems project.
--
-- Source of truth for both Studio and the Builder AppGate:
--   public.entitlements.flowchart_plus  boolean default false
--   public.entitlements.builder_pro     boolean default false
--
-- Print / PNG / JSON export: flowchart_plus OR builder_pro
-- Export to Builder / attach: builder_pro only
-- Studio signup does not set either flag. Only the service role (webhook) writes.

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  flowchart_plus boolean not null default false,
  builder_pro boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.entitlements is
  'Shared entitlement flags. Print/export if flowchart_plus OR builder_pro. Export to Builder only if builder_pro.';

comment on column public.entitlements.flowchart_plus is
  'Flowchart Plus $19 (SamCart slug flowchart-studio). Print and PNG/JSON export. Not Export to Builder.';

comment on column public.entitlements.builder_pro is
  'Builder Pro $39/mo (SamCart slug builder-pro). Includes print, export, and Export to Builder.';

create unique index if not exists entitlements_email_lower_idx
  on public.entitlements (lower(email));

create or replace function public.touch_entitlements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
  before update on public.entitlements
  for each row
  execute function public.touch_entitlements_updated_at();

alter table public.entitlements enable row level security;

drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own
  on public.entitlements
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.entitlements from public, anon, authenticated;
grant select on table public.entitlements to authenticated;
grant all on table public.entitlements to service_role;

-- Email → auth.users.id for the Make webhook. Not callable by anon or signed-in users.
create or replace function public.entitlement_user_id_by_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where lower(email) = lower(btrim(target_email))
  limit 1;
$$;

revoke all on function public.entitlement_user_id_by_email(text) from public;
revoke all on function public.entitlement_user_id_by_email(text) from anon;
revoke all on function public.entitlement_user_id_by_email(text) from authenticated;
grant execute on function public.entitlement_user_id_by_email(text) to service_role;

revoke all on function public.touch_entitlements_updated_at() from public;
revoke all on function public.touch_entitlements_updated_at() from anon;
revoke all on function public.touch_entitlements_updated_at() from authenticated;
grant execute on function public.touch_entitlements_updated_at() to service_role;

notify pgrst, 'reload schema';
