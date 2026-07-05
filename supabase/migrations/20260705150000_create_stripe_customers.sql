create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table public.stripe_customers from anon;
revoke all on table public.stripe_customers from authenticated;
grant select, insert, update on table public.stripe_customers to authenticated;

alter table public.stripe_customers enable row level security;

create policy "Users can view their own stripe customer"
on public.stripe_customers
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own stripe customer"
on public.stripe_customers
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own stripe customer"
on public.stripe_customers
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
