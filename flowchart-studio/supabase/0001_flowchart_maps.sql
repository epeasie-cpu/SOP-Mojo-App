-- Flowchart Studio maps, shared with Builder Pro through the same Supabase user.
-- Run this in the Builder Supabase project. Studio's API uses the service role
-- and filters by user_id. RLS lets Builder read the same rows with the user JWT.

create table if not exists public.flowchart_maps (
  id text primary key,
  user_id text not null,
  title text not null,
  graph jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flowchart_maps_user_updated_idx
  on public.flowchart_maps (user_id, updated_at desc);

alter table public.flowchart_maps enable row level security;

drop policy if exists flowchart_maps_select on public.flowchart_maps;
drop policy if exists flowchart_maps_insert on public.flowchart_maps;
drop policy if exists flowchart_maps_update on public.flowchart_maps;
drop policy if exists flowchart_maps_delete on public.flowchart_maps;

create policy flowchart_maps_select on public.flowchart_maps
  for select using (auth.uid()::text = user_id);

create policy flowchart_maps_insert on public.flowchart_maps
  for insert with check (auth.uid()::text = user_id);

create policy flowchart_maps_update on public.flowchart_maps
  for update using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy flowchart_maps_delete on public.flowchart_maps
  for delete using (auth.uid()::text = user_id);
