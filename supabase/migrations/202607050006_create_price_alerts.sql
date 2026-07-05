create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9.\^-]{1,12}$'),
  direction text not null check (direction in ('above', 'below')),
  target_price numeric not null check (target_price > 0),
  active boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists price_alerts_user_id_idx
on public.price_alerts (user_id);

create index if not exists price_alerts_active_user_id_idx
on public.price_alerts (user_id, created_at desc)
where active;

revoke all on table public.price_alerts from anon;
revoke all on table public.price_alerts from authenticated;
grant select, insert, update, delete on table public.price_alerts to authenticated;

alter table public.price_alerts enable row level security;

create policy "Users can view their own price alerts"
on public.price_alerts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own price alerts"
on public.price_alerts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own price alerts"
on public.price_alerts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own price alerts"
on public.price_alerts
for delete
to authenticated
using ((select auth.uid()) = user_id);
