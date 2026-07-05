revoke insert, update, delete on table public.paper_accounts from authenticated;
revoke insert, update, delete on table public.paper_trades from authenticated;
revoke insert, update, delete on table public.paper_equity_snapshots from authenticated;

grant select, insert, update, delete on table public.paper_accounts to service_role;
grant select, insert, update, delete on table public.paper_trades to service_role;
grant select, insert, update, delete on table public.paper_equity_snapshots to service_role;

create or replace function public.place_paper_trade(
  p_user_id uuid,
  p_symbol text,
  p_side text,
  p_shares integer,
  p_price numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_starting_cash numeric;
  v_cash numeric;
  v_position_shares integer;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if p_symbol !~ '^[A-Z0-9.\^-]{1,12}$' then
    raise exception 'Invalid symbol';
  end if;

  if p_side not in ('buy', 'sell') then
    raise exception 'Invalid trade side';
  end if;

  if p_shares is null or p_shares <= 0 then
    raise exception 'Shares must be greater than zero';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Price must be greater than zero';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  insert into public.paper_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select starting_cash
  into v_starting_cash
  from public.paper_accounts
  where user_id = p_user_id
  for update;

  select
    coalesce(
      sum(
        case
          when side = 'buy' then -(shares * price)
          else shares * price
        end
      ),
      0
    )
  into v_cash
  from public.paper_trades
  where user_id = p_user_id;

  v_cash := v_starting_cash + v_cash;

  select
    coalesce(
      sum(
        case
          when side = 'buy' then shares
          else -shares
        end
      ),
      0
    )
  into v_position_shares
  from public.paper_trades
  where user_id = p_user_id
    and symbol = p_symbol;

  if p_side = 'buy' and (p_shares * p_price) > v_cash then
    raise exception 'Not enough paper cash for this trade';
  end if;

  if p_side = 'sell' and p_shares > v_position_shares then
    raise exception 'Not enough shares to sell';
  end if;

  insert into public.paper_trades (user_id, symbol, side, shares, price)
  values (p_user_id, p_symbol, p_side, p_shares, p_price);
end;
$$;

create or replace function public.reset_paper_account(p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  delete from public.paper_trades
  where user_id = p_user_id;

  delete from public.paper_equity_snapshots
  where user_id = p_user_id;
end;
$$;

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

  insert into public.paper_equity_snapshots (user_id, snapshot_date, equity)
  values (p_user_id, current_date, p_equity)
  on conflict (user_id, snapshot_date)
  do update set equity = excluded.equity;
end;
$$;

revoke all on function public.place_paper_trade(uuid, text, text, integer, numeric) from public;
revoke all on function public.place_paper_trade(uuid, text, text, integer, numeric) from anon;
revoke all on function public.place_paper_trade(uuid, text, text, integer, numeric) from authenticated;
grant execute on function public.place_paper_trade(uuid, text, text, integer, numeric) to service_role;

revoke all on function public.reset_paper_account(uuid) from public;
revoke all on function public.reset_paper_account(uuid) from anon;
revoke all on function public.reset_paper_account(uuid) from authenticated;
grant execute on function public.reset_paper_account(uuid) to service_role;

revoke all on function public.upsert_paper_equity_snapshot(uuid, numeric) from public;
revoke all on function public.upsert_paper_equity_snapshot(uuid, numeric) from anon;
revoke all on function public.upsert_paper_equity_snapshot(uuid, numeric) from authenticated;
grant execute on function public.upsert_paper_equity_snapshot(uuid, numeric) to service_role;
