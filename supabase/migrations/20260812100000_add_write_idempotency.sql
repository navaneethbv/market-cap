alter table public.holdings
  add column if not exists idempotency_key uuid;

create unique index if not exists holdings_user_id_idempotency_key_idx
on public.holdings (user_id, idempotency_key)
where idempotency_key is not null;

alter table public.paper_trades
  add column if not exists idempotency_key uuid;

create unique index if not exists paper_trades_user_id_idempotency_key_idx
on public.paper_trades (user_id, idempotency_key)
where idempotency_key is not null;

drop function if exists public.place_paper_trade(uuid, text, text, integer, numeric);

create or replace function public.place_paper_trade(
  p_user_id uuid,
  p_symbol text,
  p_side text,
  p_shares integer,
  p_price numeric,
  p_idempotency_key uuid
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
  v_existing_symbol text;
  v_existing_side text;
  v_existing_shares integer;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if p_idempotency_key is null then
    raise exception 'Idempotency key is required';
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

  select symbol, side, shares
  into v_existing_symbol, v_existing_side, v_existing_shares
  from public.paper_trades
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key;

  if v_existing_symbol is not null then
    if v_existing_symbol = p_symbol
      and v_existing_side = p_side
      and v_existing_shares = p_shares then
      return;
    end if;
    raise exception 'Idempotency key was already used for another trade';
  end if;

  insert into public.paper_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select starting_cash
  into v_starting_cash
  from public.paper_accounts
  where user_id = p_user_id
  for update;

  select coalesce(sum(case when side = 'buy' then -(shares * price) else shares * price end), 0)
  into v_cash
  from public.paper_trades
  where user_id = p_user_id;

  v_cash := v_starting_cash + v_cash;

  select coalesce(sum(case when side = 'buy' then shares else -shares end), 0)
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

  insert into public.paper_trades (user_id, symbol, side, shares, price, idempotency_key)
  values (p_user_id, p_symbol, p_side, p_shares, p_price, p_idempotency_key);
end;
$$;

revoke all on function public.place_paper_trade(uuid, text, text, integer, numeric, uuid) from public;
revoke all on function public.place_paper_trade(uuid, text, text, integer, numeric, uuid) from anon;
revoke all on function public.place_paper_trade(uuid, text, text, integer, numeric, uuid) from authenticated;
grant execute on function public.place_paper_trade(uuid, text, text, integer, numeric, uuid) to service_role;
