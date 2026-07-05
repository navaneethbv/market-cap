create table if not exists public.saved_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  symbols text[] not null check (array_length(symbols, 1) between 2 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_comparisons_user_id_idx
on public.saved_comparisons (user_id);

revoke all on table public.saved_comparisons from anon;
revoke all on table public.saved_comparisons from authenticated;
grant select, insert, update, delete on table public.saved_comparisons to authenticated;

alter table public.saved_comparisons enable row level security;

create policy "Users can view their own saved comparisons"
on public.saved_comparisons
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own saved comparisons"
on public.saved_comparisons
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own saved comparisons"
on public.saved_comparisons
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own saved comparisons"
on public.saved_comparisons
for delete
to authenticated
using ((select auth.uid()) = user_id);
