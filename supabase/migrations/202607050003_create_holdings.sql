create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9.\^-]{1,12}$'),
  shares numeric not null check (shares > 0),
  avg_cost numeric not null check (avg_cost > 0),
  purchased_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists holdings_user_id_idx on public.holdings (user_id);
create index if not exists holdings_symbol_idx on public.holdings (symbol);

revoke all on table public.holdings from anon;
revoke all on table public.holdings from authenticated;
grant select, insert, update, delete on table public.holdings to authenticated;

alter table public.holdings enable row level security;

create policy "Users can view their own holdings"
on public.holdings
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own holdings"
on public.holdings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own holdings"
on public.holdings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own holdings"
on public.holdings
for delete
to authenticated
using ((select auth.uid()) = user_id);
