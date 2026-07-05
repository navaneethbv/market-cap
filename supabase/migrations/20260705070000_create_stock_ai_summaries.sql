create table if not exists public.stock_ai_summaries (
  symbol text primary key,
  analysis jsonb not null,
  updated_at timestamptz not null default now()
);

revoke all on table public.stock_ai_summaries from anon;
revoke all on table public.stock_ai_summaries from authenticated;

grant select, insert, update on table public.stock_ai_summaries to authenticated;

alter table public.stock_ai_summaries enable row level security;

create policy "Allow authenticated select on stock_ai_summaries"
on public.stock_ai_summaries
for select
to authenticated
using (true);

create policy "Allow authenticated insert on stock_ai_summaries"
on public.stock_ai_summaries
for insert
to authenticated
with check (true);

create policy "Allow authenticated update on stock_ai_summaries"
on public.stock_ai_summaries
for update
to authenticated
using (true)
with check (true);
