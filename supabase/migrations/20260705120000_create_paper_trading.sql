create table if not exists public.paper_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  starting_cash numeric not null default 100000 check (starting_cash > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9.\^-]{1,12}$'),
  side text not null check (side in ('buy', 'sell')),
  shares integer not null check (shares > 0),
  price numeric not null check (price > 0),
  executed_at timestamptz not null default now()
);

create index if not exists paper_trades_user_id_executed_at_idx
on public.paper_trades (user_id, executed_at desc);

create table if not exists public.paper_equity_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  equity numeric not null check (equity >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

revoke all on table public.paper_accounts from anon;
revoke all on table public.paper_accounts from authenticated;
grant select, insert on table public.paper_accounts to authenticated;

revoke all on table public.paper_trades from anon;
revoke all on table public.paper_trades from authenticated;
grant select, insert, delete on table public.paper_trades to authenticated;

revoke all on table public.paper_equity_snapshots from anon;
revoke all on table public.paper_equity_snapshots from authenticated;
grant select, insert, update, delete on table public.paper_equity_snapshots to authenticated;

alter table public.paper_accounts enable row level security;
alter table public.paper_trades enable row level security;
alter table public.paper_equity_snapshots enable row level security;

create policy "Users can view their own paper account"
on public.paper_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own paper account"
on public.paper_accounts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can view their own paper trades"
on public.paper_trades
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own paper trades"
on public.paper_trades
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own paper trades"
on public.paper_trades
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own equity snapshots"
on public.paper_equity_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own equity snapshots"
on public.paper_equity_snapshots
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own equity snapshots"
on public.paper_equity_snapshots
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own equity snapshots"
on public.paper_equity_snapshots
for delete
to authenticated
using ((select auth.uid()) = user_id);
