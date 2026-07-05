# Paper Trading (Mock Trading) Design

Date: 2026-07-05
Status: Approved by user

## Goal

Let a signed-in user practice trading US stocks with virtual money against
real market prices: start with $100,000, buy and sell at live Finnhub
quotes, and track gain/loss over time. Zero risk, works 24/7 (fills use the
latest available quote outside market hours).

## Scope decisions (user-approved)

- Live paper trading only. No historical day replay: free API tiers offer
  no tick data (Finnhub) and only rate-limited OHLC candles (Twelve Data).
- US stocks only, matching the rest of MarketCap. No futures or crypto.
- Starting cash $100,000 with a user-triggered reset back to a fresh account.
- Market orders only, filled instantly at the current Finnhub quote price.
- Long positions only. No short selling, no limit orders in v1.
- Whole shares only (integer quantities).

## Architecture: ledger as single source of truth

Every fill is a row in `paper_trades`. Cash, open positions, average cost,
and realized P&L are derived from the ledger by pure functions in
`lib/paper-trading.ts`. Placing a trade is a single row insert, so there is
no multi-statement transaction to coordinate. Rejected alternatives:

- Materialized `paper_positions` table: needs a Postgres RPC for atomic
  cash + position + history updates and creates a second source of truth.
- No account row: reset would mean deleting history with nowhere to hang
  future account settings.

### Known caveat (accepted)

Trade validation (sufficient cash or shares) runs in the server action
before the insert without a DB lock. Two simultaneous submissions could
briefly overspend virtual cash. Accepted for a mock account; the ledger
still records exactly what happened.

## Data model

One migration, `create_paper_trading`, following the standard hardening
recipe (check constraints, revoke all from anon/authenticated, explicit
grants, RLS enabled, per-operation policies on
`(select auth.uid()) = user_id`).

- `paper_accounts`: `id` uuid PK, `user_id` uuid unique not null references
  `auth.users(id)` on delete cascade, `starting_cash` numeric not null
  default 100000 check (> 0), `created_at`, `updated_at`. Created lazily on
  first `/trading` visit.
- `paper_trades`: `id` uuid PK, `user_id` (same FK recipe), `symbol` text
  check `^[A-Z0-9.\^-]{1,12}$`, `side` text check in ('buy', 'sell'),
  `shares` integer check (> 0), `price` numeric check (> 0), `executed_at`
  timestamptz default now().
- `paper_equity_snapshots`: `id` uuid PK, `user_id` (same FK recipe),
  `snapshot_date` date not null, `equity` numeric not null check (>= 0),
  unique (`user_id`, `snapshot_date`).

Indexes: `user_id` on all three; `(user_id, executed_at desc)` on trades.

Account reset: delete the user's rows from `paper_trades` and
`paper_equity_snapshots` (authenticated delete grants + RLS policies cover
this). `starting_cash` stays 100000 in v1.

## Pure helpers: `lib/paper-trading.ts`

Node-tested, no imports beyond types. Average-cost method (what brokers
display), not FIFO.

- `normalizePaperTradeInput({ symbol, side, shares })`: trims/uppercases
  the symbol against the shared pattern, requires side buy/sell, requires a
  positive integer share count. Throws on bad input (same contract as the
  other normalizers).
- `buildPaperPortfolio(trades)`: replays the ledger in executed order and
  returns `{ cashDelta, positions, realizedPnl }` where `positions` is a
  list of `{ symbol, shares, avgCost, costBasis }` for symbols with shares
  greater than 0. Buys increase shares and re-average cost; sells reduce
  shares at the current average cost and add
  `(sellPrice - avgCost) * shares` to `realizedPnl`.
- `validatePaperTrade({ side, shares, price, cash, position })`: returns an
  error string or null. Buys require `shares * price <= cash`; sells
  require `shares <= position.shares`.
- `buildPaperSummary({ startingCash, portfolio, quotes })`: combines the
  derived portfolio with live quotes into `{ cash, marketValue, equity,
  unrealizedPnl, realizedPnl, totalReturn, totalReturnPercent }`. Positions
  missing a quote contribute cost basis to equity and null unrealized P&L
  per row (marked in the UI), mirroring how holdings handle quote failures.

`cash = startingCash + cashDelta`. `equity = cash + marketValue`.
`totalReturn = equity - startingCash`.

## Server actions: `app/trading/actions.ts`

Same pattern as the other action files: `requireUser()`, pure normalizer
that throws, mutations scoped by `.eq("user_id", user.id)`, then
`revalidatePath("/trading")` (and `/trading/history` where relevant).

- `placePaperTrade(formData)`: normalize input, ensure the account row
  exists (insert if missing), fetch the live quote server side with
  `getQuote(symbol)` (reject if it fails), derive cash/position from the
  ledger, run `validatePaperTrade`, insert the trade at `quote.price`.
- `resetPaperAccount(formData)`: delete the user's trades and snapshots.

## Routes and UI

Both pages are authenticated: add `/trading` to `PROTECTED_PATHS` in
`proxy.ts` (covers `/trading/history` by prefix); pages also self-redirect.

- `/trading` (`app/trading/page.tsx`):
  - Summary cards: Equity, Cash, Unrealized P&L, Total return (vs
    starting cash), following the existing card grid pattern.
  - Trade ticket: symbol input (pre-filled from `?symbol=` query param),
    integer shares input, Buy and Sell submit buttons, current quote
    displayed for the pre-filled symbol. Forms carry `required`,
    `maxLength`, `min`, and `step` attributes mirroring server validation.
  - Positions table: symbol (links to `/stock/[symbol]`), shares, avg
    cost, live price, market value, unrealized P&L with ChangeChip, and a
    quick sell-all form per row.
  - Recent trades (last 10) and a link to `/trading/history`.
  - Reset account form (with a confirm affordance) when trades exist.
  - On load, upsert today's row in `paper_equity_snapshots` with current
    equity (insert or update via unique `(user_id, snapshot_date)`).
- `/trading/history` (`app/trading/history/page.tsx`):
  - Equity curve: Recharts line/area over the snapshot rows (client
    component fed serialized snapshot data, like StockChart's pattern).
  - Realized P&L summary and the full trade log table (side, shares,
    price, total, executed time).
- Stock page: a small "Trade" button next to Watch linking to
  `/trading?symbol=SYMBOL`.
- Sidebar and mobile nav: "Trading" item (CandlestickChart icon) between
  Portfolio and Alerts.

Quote fan-out for positions uses `Promise.allSettled` with per-row error
strings, identical to watchlist/portfolio pages.

## Testing

- `lib/paper-trading.test.mjs`: buys average up correctly across multiple
  fills; sells realize P&L at average cost and reduce shares; selling the
  full position removes it; oversell and overspend rejected by
  `validatePaperTrade`; input normalizer rejects bad symbols, sides, zero,
  negative, and fractional shares; summary math with mixed
  quote-available/unavailable positions; empty ledger yields starting cash.
- `lib/migrations.test.mjs`: extend with the three-table recipe assertions
  (FKs, checks, unique constraints, revoke/grant, RLS, policies).
- `npm run lint` and `npm run build` must stay green; CI covers all three.
- Manual smoke after implementation: place buys and sells with the test
  account, verify cash/positions/P&L update, verify reset, verify the
  unauthenticated redirect.

## Out of scope for v1 (possible follow-ups)

- Historical day replay (needs a tick-data provider).
- Limit orders, short selling, fractional shares, options.
- Crypto symbols (Finnhub free tier does offer crypto quotes).
- Leaderboards or multiple accounts per user.
