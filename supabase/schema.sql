create extension if not exists pgcrypto;

create table if not exists public.saved_wines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  fingerprint text not null,
  wine jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table if not exists public.scan_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  wine_name text,
  created_at timestamptz not null default now()
);

alter table public.saved_wines enable row level security;
alter table public.scan_events enable row level security;

create policy "Users read their saved wines" on public.saved_wines
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users save their wines" on public.saved_wines
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their saved wines" on public.saved_wines
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their saved wines" on public.saved_wines
  for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Users read their scan history" on public.scan_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users record their scans" on public.scan_events
  for insert to authenticated with check ((select auth.uid()) = user_id);

create index if not exists saved_wines_user_created_idx on public.saved_wines (user_id, created_at desc);
create index if not exists scan_events_user_created_idx on public.scan_events (user_id, created_at desc);
