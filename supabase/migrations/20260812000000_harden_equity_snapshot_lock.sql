-- Recreate upsert_paper_equity_snapshot to take the same per-user advisory
-- lock as reset_paper_account. Without it, a reset that deletes a user's
-- snapshots could race an in-flight page-render snapshot upsert and leave a
-- stray equity point after the reset completed.
create or replace function public.upsert_paper_equity_snapshot(
  p_user_id uuid,
  p_equity numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if p_equity is null or p_equity < 0 then
    raise exception 'Equity must be zero or greater';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  insert into public.paper_equity_snapshots (user_id, snapshot_date, equity)
  values (p_user_id, current_date, p_equity)
  on conflict (user_id, snapshot_date)
  do update set equity = excluded.equity;
end;
$$;

revoke all on function public.upsert_paper_equity_snapshot(uuid, numeric) from public;
revoke all on function public.upsert_paper_equity_snapshot(uuid, numeric) from anon;
revoke all on function public.upsert_paper_equity_snapshot(uuid, numeric) from authenticated;
grant execute on function public.upsert_paper_equity_snapshot(uuid, numeric) to service_role;
