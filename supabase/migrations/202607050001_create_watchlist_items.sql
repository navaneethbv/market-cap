create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9.\^-]{1,12}$'),
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

grant select, insert, delete on table public.watchlist_items to authenticated;
grant select, insert, update, delete on table public.watchlist_items to service_role;

alter table public.watchlist_items enable row level security;

create policy "Users can view their own watchlist items"
on public.watchlist_items
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own watchlist items"
on public.watchlist_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own watchlist items"
on public.watchlist_items
for delete
to authenticated
using ((select auth.uid()) = user_id);
