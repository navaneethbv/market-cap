-- Create paper_portfolios table
create table if not exists public.paper_portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash_balance numeric not null default 100000.00 check (cash_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table public.paper_portfolios from anon;
revoke all on table public.paper_portfolios from authenticated;
grant select, insert, update, delete on table public.paper_portfolios to authenticated;

alter table public.paper_portfolios enable row level security;

create policy "Users can view their own paper portfolio"
on public.paper_portfolios
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own paper portfolio"
on public.paper_portfolios
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own paper portfolio"
on public.paper_portfolios
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own paper portfolio"
on public.paper_portfolios
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- Create paper_holdings table
create table if not exists public.paper_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (length(trim(symbol)) > 0),
  shares numeric not null check (shares > 0),
  avg_cost numeric not null check (avg_cost > 0),
  purchased_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create index if not exists paper_holdings_user_id_idx
on public.paper_holdings (user_id);

revoke all on table public.paper_holdings from anon;
revoke all on table public.paper_holdings from authenticated;
grant select, insert, update, delete on table public.paper_holdings to authenticated;

alter table public.paper_holdings enable row level security;

create policy "Users can view their own paper holdings"
on public.paper_holdings
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own paper holdings"
on public.paper_holdings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own paper holdings"
on public.paper_holdings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own paper holdings"
on public.paper_holdings
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- Create paper_transactions table
create table if not exists public.paper_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (length(trim(symbol)) > 0),
  type text not null check (type in ('BUY', 'SELL')),
  shares numeric not null check (shares > 0),
  price numeric not null check (price > 0),
  created_at timestamptz not null default now()
);

create index if not exists paper_transactions_user_id_idx
on public.paper_transactions (user_id);

revoke all on table public.paper_transactions from anon;
revoke all on table public.paper_transactions from authenticated;
grant select, insert, update, delete on table public.paper_transactions to authenticated;

alter table public.paper_transactions enable row level security;

create policy "Users can view their own paper transactions"
on public.paper_transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own paper transactions"
on public.paper_transactions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own paper transactions"
on public.paper_transactions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own paper transactions"
on public.paper_transactions
for delete
to authenticated
using ((select auth.uid()) = user_id);
