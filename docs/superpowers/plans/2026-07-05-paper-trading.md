# Paper Trading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live paper trading: a $100k virtual account per user, market-order buys and sells filled at real-time Finnhub quotes, ledger-derived positions and P&L, and an equity-over-time history page.

**Architecture:** Every fill is a row in `paper_trades`; cash, positions, average cost, and realized P&L are derived from the ledger by pure functions in `lib/paper-trading.ts` (average-cost method). A lazily created `paper_accounts` row holds `starting_cash`; `paper_equity_snapshots` gets one upserted row per user per day when `/trading` loads. Spec: `docs/superpowers/specs/2026-07-05-paper-trading-design.md`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), Finnhub quotes via existing `lib/market/finnhub.ts`, Recharts, node test runner over raw `.ts`.

House rules: NEVER use the em dash character anywhere. Runtime imports between lib files need explicit `.ts` extensions. All work happens in `/Users/nbangalorevenugo/Desktop/market-cap/market-cap`.

---

## File structure

- Create: `supabase/migrations/20260705120000_create_paper_trading.sql` (three tables, standard hardening recipe)
- Modify: `lib/migrations.test.mjs` (recipe assertions for the new migration)
- Create: `lib/paper-trading.ts` (pure: normalize, portfolio derivation, validation, rows, summary)
- Create: `lib/paper-trading.test.mjs`
- Create: `app/trading/actions.ts` (placePaperTrade, resetPaperAccount)
- Create: `components/equity-chart.tsx` (client Recharts chart)
- Create: `app/trading/page.tsx` (summary cards, ticket, positions, recent trades, reset)
- Create: `app/trading/history/page.tsx` (equity curve, realized P&L, trade log)
- Modify: `proxy.ts` (protect `/trading`)
- Modify: `components/app-sidebar.tsx` (Trading nav item)
- Modify: `app/stock/[symbol]/page.tsx` (Trade button)
- Modify: `README.md`, `CLAUDE.md`, `docs/HANDOFF.md` (docs)

---

### Task 1: Database migration with test

**Files:**
- Modify: `lib/migrations.test.mjs` (append a new test at the end of the file)
- Create: `supabase/migrations/20260705120000_create_paper_trading.sql`

- [ ] **Step 1: Append the failing migration test**

Append to the end of `lib/migrations.test.mjs`:

```js
test("paper trading migration creates RLS-protected tables", async () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files.filter((file) => file.includes("paper_trading"));

  assert.ok(migrationFiles.length > 0, "expected a paper trading migration file");

  const sql = (
    await Promise.all(
      migrationFiles.map((file) => readFile(join(migrationsDir, file), "utf8"))
    )
  ).join("\n");
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  assert.match(normalized, /create table if not exists public\.paper_accounts/);
  assert.match(
    normalized,
    /user_id uuid not null unique references auth\.users\(id\) on delete cascade/
  );
  assert.match(
    normalized,
    /starting_cash numeric not null default 100000 check \(starting_cash > 0\)/
  );

  assert.match(normalized, /create table if not exists public\.paper_trades/);
  assert.match(normalized, /side text not null check \(side in \('buy', 'sell'\)\)/);
  assert.match(normalized, /shares integer not null check \(shares > 0\)/);
  assert.match(normalized, /price numeric not null check \(price > 0\)/);
  assert.match(
    normalized,
    /create index if not exists paper_trades_user_id_executed_at_idx on public\.paper_trades \(user_id, executed_at desc\)/
  );

  assert.match(
    normalized,
    /create table if not exists public\.paper_equity_snapshots/
  );
  assert.match(normalized, /equity numeric not null check \(equity >= 0\)/);
  assert.match(normalized, /unique \(user_id, snapshot_date\)/);

  for (const table of [
    "paper_accounts",
    "paper_trades",
    "paper_equity_snapshots",
  ]) {
    assert.match(
      normalized,
      new RegExp(`revoke all on table public\\.${table} from anon`)
    );
    assert.match(
      normalized,
      new RegExp(`revoke all on table public\\.${table} from authenticated`)
    );
    assert.match(
      normalized,
      new RegExp(`alter table public\\.${table} enable row level security`)
    );
  }
  assert.match(
    normalized,
    /grant select, insert on table public\.paper_accounts to authenticated/
  );
  assert.match(
    normalized,
    /grant select, insert, delete on table public\.paper_trades to authenticated/
  );
  assert.match(
    normalized,
    /grant select, insert, update, delete on table public\.paper_equity_snapshots to authenticated/
  );
  assert.match(normalized, /\(select auth\.uid\(\)\) = user_id/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --no-warnings --test lib/migrations.test.mjs`
Expected: FAIL with "expected a paper trading migration file"

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/20260705120000_create_paper_trading.sql`:

```sql
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --no-warnings --test lib/migrations.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/migrations.test.mjs supabase/migrations/20260705120000_create_paper_trading.sql
git commit -m "Add paper trading tables migration"
```

Note: applying the migration to the remote Supabase project happens at the
end (Task 11); local tests only assert the SQL recipe.

---

### Task 2: Pure helper types and input normalizer

**Files:**
- Create: `lib/paper-trading.ts`
- Create: `lib/paper-trading.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `lib/paper-trading.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePaperTradeInput } from "./paper-trading.ts";

test("normalizePaperTradeInput uppercases symbols and parses whole shares", () => {
  assert.deepEqual(
    normalizePaperTradeInput({ symbol: " aapl ", side: "buy", shares: "10" }),
    { symbol: "AAPL", side: "buy", shares: 10 }
  );
});

test("normalizePaperTradeInput rejects invalid input", () => {
  assert.throws(
    () => normalizePaperTradeInput({ symbol: "not a symbol", side: "buy", shares: "1" }),
    /Invalid symbol/
  );
  assert.throws(
    () => normalizePaperTradeInput({ symbol: "AAPL", side: "hold", shares: "1" }),
    /Invalid trade side/
  );
  for (const shares of ["0", "-3", "1.5", "abc", ""]) {
    assert.throws(
      () => normalizePaperTradeInput({ symbol: "AAPL", side: "sell", shares }),
      /Shares must be a positive whole number/
    );
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --no-warnings --test lib/paper-trading.test.mjs`
Expected: FAIL (module `./paper-trading.ts` not found)

- [ ] **Step 3: Create the module with types and the normalizer**

Create `lib/paper-trading.ts`:

```ts
import type { Quote } from "./market/types";

export type PaperTradeSide = "buy" | "sell";

export interface PaperTrade {
  id: string;
  symbol: string;
  side: PaperTradeSide;
  shares: number;
  price: number;
  executed_at: string;
}

export interface PaperTradeInput {
  symbol: string;
  side: string;
  shares: string | number;
}

export interface NormalizedPaperTradeInput {
  symbol: string;
  side: PaperTradeSide;
  shares: number;
}

export interface PaperPosition {
  symbol: string;
  shares: number;
  avgCost: number;
  costBasis: number;
}

export interface PaperPortfolio {
  cashDelta: number;
  positions: PaperPosition[];
  realizedPnl: number;
}

export interface PaperPositionRow extends PaperPosition {
  quote: Quote | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
  error: string | null;
}

export interface PaperSummary {
  cash: number;
  marketValue: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalReturn: number;
  totalReturnPercent: number;
}

export const DEFAULT_STARTING_CASH = 100_000;

const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;

export function normalizePaperTradeInput(
  input: PaperTradeInput
): NormalizedPaperTradeInput {
  const symbol = input.symbol.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new Error("Invalid symbol");
  }

  if (input.side !== "buy" && input.side !== "sell") {
    throw new Error("Invalid trade side");
  }

  const shares =
    typeof input.shares === "number" ? input.shares : Number(input.shares);
  if (!Number.isInteger(shares) || shares <= 0) {
    throw new Error("Shares must be a positive whole number");
  }

  return { symbol, side: input.side, shares };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --no-warnings --test lib/paper-trading.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/paper-trading.ts lib/paper-trading.test.mjs
git commit -m "Add paper trading types and input normalizer"
```

---

### Task 3: Ledger derivation (buildPaperPortfolio)

**Files:**
- Modify: `lib/paper-trading.ts` (append function)
- Modify: `lib/paper-trading.test.mjs` (append tests)

- [ ] **Step 1: Append the failing tests**

Append to `lib/paper-trading.test.mjs` (also add `buildPaperPortfolio` to the import):

```js
function trade(overrides) {
  return {
    id: "t",
    symbol: "AAPL",
    side: "buy",
    shares: 1,
    price: 100,
    executed_at: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

test("buildPaperPortfolio averages cost across buys", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "1", shares: 10, price: 100, executed_at: "2026-07-01T10:00:00Z" }),
    trade({ id: "2", shares: 10, price: 200, executed_at: "2026-07-01T11:00:00Z" }),
  ]);

  assert.equal(portfolio.cashDelta, -3000);
  assert.equal(portfolio.realizedPnl, 0);
  assert.deepEqual(portfolio.positions, [
    { symbol: "AAPL", shares: 20, avgCost: 150, costBasis: 3000 },
  ]);
});

test("buildPaperPortfolio realizes P&L on sells at average cost", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "1", shares: 10, price: 100, executed_at: "2026-07-01T10:00:00Z" }),
    trade({ id: "2", shares: 10, price: 200, executed_at: "2026-07-01T11:00:00Z" }),
    trade({ id: "3", side: "sell", shares: 5, price: 180, executed_at: "2026-07-01T12:00:00Z" }),
  ]);

  assert.equal(portfolio.cashDelta, -2100);
  assert.equal(portfolio.realizedPnl, 150);
  assert.deepEqual(portfolio.positions, [
    { symbol: "AAPL", shares: 15, avgCost: 150, costBasis: 2250 },
  ]);
});

test("buildPaperPortfolio removes fully sold positions and sorts by symbol", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "1", symbol: "MSFT", shares: 2, price: 50, executed_at: "2026-07-01T10:00:00Z" }),
    trade({ id: "2", symbol: "AAPL", shares: 3, price: 10, executed_at: "2026-07-01T11:00:00Z" }),
    trade({ id: "3", symbol: "MSFT", side: "sell", shares: 2, price: 60, executed_at: "2026-07-01T12:00:00Z" }),
  ]);

  assert.equal(portfolio.realizedPnl, 20);
  assert.deepEqual(
    portfolio.positions.map((position) => position.symbol),
    ["AAPL"]
  );
});

test("buildPaperPortfolio handles an empty ledger", () => {
  assert.deepEqual(buildPaperPortfolio([]), {
    cashDelta: 0,
    positions: [],
    realizedPnl: 0,
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --experimental-strip-types --no-warnings --test lib/paper-trading.test.mjs`
Expected: FAIL (buildPaperPortfolio is not exported)

- [ ] **Step 3: Append the implementation**

Append to `lib/paper-trading.ts`:

```ts
export function buildPaperPortfolio(trades: PaperTrade[]): PaperPortfolio {
  const ordered = trades.toSorted((a, b) =>
    a.executed_at.localeCompare(b.executed_at)
  );
  const bySymbol = new Map<string, { shares: number; costBasis: number }>();
  let cashDelta = 0;
  let realizedPnl = 0;

  for (const trade of ordered) {
    const position = bySymbol.get(trade.symbol) ?? { shares: 0, costBasis: 0 };
    const value = trade.shares * trade.price;

    if (trade.side === "buy") {
      cashDelta -= value;
      position.shares += trade.shares;
      position.costBasis += value;
    } else {
      cashDelta += value;
      const avgCost =
        position.shares === 0 ? 0 : position.costBasis / position.shares;
      realizedPnl += (trade.price - avgCost) * trade.shares;
      position.costBasis -= avgCost * trade.shares;
      position.shares -= trade.shares;
    }

    if (position.shares > 0) {
      bySymbol.set(trade.symbol, position);
    } else {
      bySymbol.delete(trade.symbol);
    }
  }

  return {
    cashDelta,
    realizedPnl,
    positions: [...bySymbol.entries()]
      .map(([symbol, { shares, costBasis }]) => ({
        symbol,
        shares,
        avgCost: costBasis / shares,
        costBasis,
      }))
      .toSorted((a, b) => a.symbol.localeCompare(b.symbol)),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --no-warnings --test lib/paper-trading.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/paper-trading.ts lib/paper-trading.test.mjs
git commit -m "Derive paper positions and realized P&L from the trade ledger"
```

---

### Task 4: Trade validation

**Files:**
- Modify: `lib/paper-trading.ts` (append function)
- Modify: `lib/paper-trading.test.mjs` (append tests, extend import)

- [ ] **Step 1: Append the failing tests**

```js
test("validatePaperTrade rejects overspending and overselling", () => {
  assert.equal(
    validatePaperTrade({ side: "buy", shares: 10, price: 100, cash: 999, positionShares: 0 }),
    "Insufficient cash for this order"
  );
  assert.equal(
    validatePaperTrade({ side: "sell", shares: 5, price: 100, cash: 0, positionShares: 4 }),
    "Not enough shares to sell"
  );
  assert.equal(
    validatePaperTrade({ side: "buy", shares: 10, price: 100, cash: 1000, positionShares: 0 }),
    null
  );
  assert.equal(
    validatePaperTrade({ side: "sell", shares: 4, price: 100, cash: 0, positionShares: 4 }),
    null
  );
});
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `node --experimental-strip-types --no-warnings --test lib/paper-trading.test.mjs`
Expected: FAIL (validatePaperTrade is not exported)

- [ ] **Step 3: Append the implementation**

```ts
export function validatePaperTrade({
  side,
  shares,
  price,
  cash,
  positionShares,
}: {
  side: PaperTradeSide;
  shares: number;
  price: number;
  cash: number;
  positionShares: number;
}): string | null {
  if (side === "buy" && shares * price > cash) {
    return "Insufficient cash for this order";
  }
  if (side === "sell" && shares > positionShares) {
    return "Not enough shares to sell";
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --no-warnings --test lib/paper-trading.test.mjs`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/paper-trading.ts lib/paper-trading.test.mjs
git commit -m "Validate paper trades against cash and position size"
```

---

### Task 5: Position rows and account summary

**Files:**
- Modify: `lib/paper-trading.ts` (append two functions)
- Modify: `lib/paper-trading.test.mjs` (append tests, extend import)

- [ ] **Step 1: Append the failing tests**

```js
test("buildPaperPositionRows pairs quotes and marks failures", () => {
  const positions = [
    { symbol: "AAPL", shares: 15, avgCost: 150, costBasis: 2250 },
    { symbol: "MSFT", shares: 2, avgCost: 50, costBasis: 100 },
  ];
  const rows = buildPaperPositionRows(positions, [
    { status: "fulfilled", value: { symbol: "AAPL", price: 160 } },
    { status: "rejected", reason: new Error("quota exceeded") },
  ]);

  assert.equal(rows[0].marketValue, 2400);
  assert.equal(rows[0].unrealizedPnl, 150);
  assert.ok(Math.abs(rows[0].unrealizedPnlPercent - 6.6666) < 0.001);
  assert.equal(rows[0].error, null);

  assert.equal(rows[1].marketValue, null);
  assert.equal(rows[1].unrealizedPnl, null);
  assert.equal(rows[1].error, "quota exceeded");
});

test("buildPaperSummary combines cash, market value, and P&L", () => {
  const portfolio = {
    cashDelta: -2100,
    realizedPnl: 150,
    positions: [{ symbol: "AAPL", shares: 15, avgCost: 150, costBasis: 2250 }],
  };
  const rows = buildPaperPositionRows(portfolio.positions, [
    { status: "fulfilled", value: { symbol: "AAPL", price: 160 } },
  ]);
  const summary = buildPaperSummary({
    startingCash: 100000,
    portfolio,
    positionRows: rows,
  });

  assert.equal(summary.cash, 97900);
  assert.equal(summary.marketValue, 2400);
  assert.equal(summary.equity, 100300);
  assert.equal(summary.unrealizedPnl, 150);
  assert.equal(summary.realizedPnl, 150);
  assert.equal(summary.totalReturn, 300);
  assert.equal(summary.totalReturnPercent, 0.3);
});

test("buildPaperSummary counts unquoted positions at cost basis", () => {
  const portfolio = {
    cashDelta: -100,
    realizedPnl: 0,
    positions: [{ symbol: "MSFT", shares: 2, avgCost: 50, costBasis: 100 }],
  };
  const rows = buildPaperPositionRows(portfolio.positions, [
    { status: "rejected", reason: new Error("no quote") },
  ]);
  const summary = buildPaperSummary({
    startingCash: 100000,
    portfolio,
    positionRows: rows,
  });

  assert.equal(summary.marketValue, 100);
  assert.equal(summary.equity, 100000);
  assert.equal(summary.unrealizedPnl, 0);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --experimental-strip-types --no-warnings --test lib/paper-trading.test.mjs`
Expected: FAIL (buildPaperPositionRows is not exported)

- [ ] **Step 3: Append the implementation**

```ts
export function buildPaperPositionRows(
  positions: PaperPosition[],
  quoteResults: PromiseSettledResult<Quote>[]
): PaperPositionRow[] {
  return positions.map((position, index) => {
    const result = quoteResults[index];
    const quote = result?.status === "fulfilled" ? result.value : null;
    const marketValue = quote ? position.shares * quote.price : null;
    const unrealizedPnl =
      marketValue === null ? null : marketValue - position.costBasis;

    return {
      ...position,
      quote,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPercent:
        unrealizedPnl === null || position.costBasis === 0
          ? null
          : (unrealizedPnl / position.costBasis) * 100,
      error:
        result?.status === "rejected"
          ? result.reason instanceof Error
            ? result.reason.message
            : "Quote unavailable"
          : null,
    };
  });
}

export function buildPaperSummary({
  startingCash,
  portfolio,
  positionRows,
}: {
  startingCash: number;
  portfolio: PaperPortfolio;
  positionRows: PaperPositionRow[];
}): PaperSummary {
  const cash = startingCash + portfolio.cashDelta;
  // Positions without a live quote are counted at cost basis so equity
  // stays meaningful when a quote fetch fails
  const marketValue = positionRows.reduce(
    (total, row) => total + (row.marketValue ?? row.costBasis),
    0
  );
  const unrealizedPnl = positionRows.reduce(
    (total, row) => total + (row.unrealizedPnl ?? 0),
    0
  );
  const equity = cash + marketValue;
  const totalReturn = equity - startingCash;

  return {
    cash,
    marketValue,
    equity,
    unrealizedPnl,
    realizedPnl: portfolio.realizedPnl,
    totalReturn,
    totalReturnPercent:
      startingCash === 0 ? 0 : (totalReturn / startingCash) * 100,
  };
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS (all tests including 10 in paper-trading)

- [ ] **Step 5: Commit**

```bash
git add lib/paper-trading.ts lib/paper-trading.test.mjs
git commit -m "Add paper position rows and account summary math"
```

---

### Task 6: Server actions

**Files:**
- Create: `app/trading/actions.ts`

- [ ] **Step 1: Create the actions file**

Create `app/trading/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getQuote } from "@/lib/market/finnhub";
import {
  buildPaperPortfolio,
  DEFAULT_STARTING_CASH,
  normalizePaperTradeInput,
  validatePaperTrade,
  type PaperTrade,
} from "@/lib/paper-trading";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trading");
  }

  return { supabase, user };
}

export async function placePaperTrade(formData: FormData) {
  const { supabase, user } = await requireUser();
  const input = normalizePaperTradeInput({
    symbol: String(formData.get("symbol") ?? ""),
    side: String(formData.get("side") ?? ""),
    shares: String(formData.get("shares") ?? ""),
  });

  const { data: account, error: accountError } = await supabase
    .from("paper_accounts")
    .select("id,starting_cash")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError) {
    throw new Error(accountError.message);
  }

  if (!account) {
    const { error } = await supabase
      .from("paper_accounts")
      .insert({ user_id: user.id });

    // 23505 = another request created the account concurrently
    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }
  }

  const startingCash = account
    ? Number(account.starting_cash)
    : DEFAULT_STARTING_CASH;

  let quotePrice: number;
  try {
    quotePrice = (await getQuote(input.symbol)).price;
  } catch {
    throw new Error(`No live quote available for ${input.symbol}`);
  }

  const { data: tradeData, error: tradesError } = await supabase
    .from("paper_trades")
    .select("id,symbol,side,shares,price,executed_at")
    .eq("user_id", user.id);

  if (tradesError) {
    throw new Error(tradesError.message);
  }

  const trades = (tradeData ?? []).map((row) => ({
    ...row,
    shares: Number(row.shares),
    price: Number(row.price),
  })) as PaperTrade[];
  const portfolio = buildPaperPortfolio(trades);
  const cash = startingCash + portfolio.cashDelta;
  const positionShares =
    portfolio.positions.find((position) => position.symbol === input.symbol)
      ?.shares ?? 0;

  const validationError = validatePaperTrade({
    side: input.side,
    shares: input.shares,
    price: quotePrice,
    cash,
    positionShares,
  });

  if (validationError) {
    throw new Error(validationError);
  }

  const { error: insertError } = await supabase.from("paper_trades").insert({
    user_id: user.id,
    symbol: input.symbol,
    side: input.side,
    shares: input.shares,
    price: quotePrice,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/trading");
  revalidatePath("/trading/history");
}

export async function resetPaperAccount() {
  const { supabase, user } = await requireUser();

  const { error: tradesError } = await supabase
    .from("paper_trades")
    .delete()
    .eq("user_id", user.id);

  if (tradesError) {
    throw new Error(tradesError.message);
  }

  const { error: snapshotsError } = await supabase
    .from("paper_equity_snapshots")
    .delete()
    .eq("user_id", user.id);

  if (snapshotsError) {
    throw new Error(snapshotsError.message);
  }

  revalidatePath("/trading");
  revalidatePath("/trading/history");
}
```

- [ ] **Step 2: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both succeed

- [ ] **Step 3: Commit**

```bash
git add app/trading/actions.ts
git commit -m "Add paper trade and account reset server actions"
```

---

### Task 7: Equity chart component

**Files:**
- Create: `components/equity-chart.tsx`

- [ ] **Step 1: Create the component**

Create `components/equity-chart.tsx`:

```tsx
"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/lib/format";

export interface EquityPoint {
  date: string;
  equity: number;
}

function formatTick(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function EquityChart({ points }: { points: EquityPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        Visit the trading page after placing trades to record equity points.
      </div>
    );
  }

  const first = points[0].equity;
  const last = points[points.length - 1].equity;
  const stroke = last >= first ? "rgb(16 185 129)" : "rgb(239 68 68)";

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equity-chart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            domain={["dataMin", "dataMax"]}
            orientation="right"
            tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke, strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
                  <div className="font-semibold text-foreground">
                    {formatPrice(Number(payload[0].value))}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {formatTick(String(label))}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={2.5}
            fill="url(#equity-chart)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both succeed

- [ ] **Step 3: Commit**

```bash
git add components/equity-chart.tsx
git commit -m "Add equity curve chart component"
```

---

### Task 8: /trading page

**Files:**
- Create: `app/trading/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/trading/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { CandlestickChart, RotateCcw } from "lucide-react";
import { placePaperTrade, resetPaperAccount } from "@/app/trading/actions";
import { ChangeChip } from "@/components/change-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice } from "@/lib/format";
import { getQuote } from "@/lib/market/finnhub";
import {
  buildPaperPortfolio,
  buildPaperPositionRows,
  buildPaperSummary,
  DEFAULT_STARTING_CASH,
  type PaperTrade,
} from "@/lib/paper-trading";
import { createClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/market/types";

const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;

function pnlTone(value: number) {
  return value >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

type TradingPageProps = {
  searchParams: Promise<{ symbol?: string | string[] }>;
};

export default async function TradingPage({ searchParams }: TradingPageProps) {
  const params = await searchParams;
  const rawSymbol = Array.isArray(params.symbol)
    ? params.symbol[0]
    : params.symbol;
  const prefillSymbol = (rawSymbol ?? "").trim().toUpperCase();
  const ticketSymbol = SYMBOL_PATTERN.test(prefillSymbol) ? prefillSymbol : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trading");
  }

  const [{ data: account }, { data: tradeData, error: tradesError }] =
    await Promise.all([
      supabase
        .from("paper_accounts")
        .select("id,starting_cash")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("paper_trades")
        .select("id,symbol,side,shares,price,executed_at")
        .eq("user_id", user.id)
        .order("executed_at", { ascending: false }),
    ]);

  if (tradesError) {
    throw new Error(tradesError.message);
  }

  const startingCash = account
    ? Number(account.starting_cash)
    : DEFAULT_STARTING_CASH;
  const trades = (tradeData ?? []).map((row) => ({
    ...row,
    shares: Number(row.shares),
    price: Number(row.price),
  })) as PaperTrade[];
  const portfolio = buildPaperPortfolio(trades);
  const quoteResults = await Promise.allSettled(
    portfolio.positions.map((position) => getQuote(position.symbol))
  );
  const positionRows = buildPaperPositionRows(portfolio.positions, quoteResults);
  const summary = buildPaperSummary({
    startingCash,
    portfolio,
    positionRows,
  });

  let ticketQuote: Quote | null = null;
  if (ticketSymbol) {
    try {
      ticketQuote = await getQuote(ticketSymbol);
    } catch {
      ticketQuote = null;
    }
  }

  // Record today's equity so the history page can chart it. Best effort:
  // a failed snapshot must not break the page.
  if (account && trades.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const { error: snapshotError } = await supabase
      .from("paper_equity_snapshots")
      .upsert(
        {
          user_id: user.id,
          snapshot_date: today,
          equity: Math.max(0, summary.equity),
        },
        { onConflict: "user_id,snapshot_date" }
      );
    if (snapshotError) {
      console.error("equity snapshot failed:", snapshotError.message);
    }
  }

  const recentTrades = trades.slice(0, 10);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Paper trading</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Practice trading
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Trade US stocks with virtual cash at real market prices. Zero
              risk, live quotes, honest P&L.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/trading/history">History</Link>
            </Button>
            {trades.length > 0 && (
              <form action={resetPaperAccount}>
                <Button type="submit" variant="outline" className="rounded-full">
                  <RotateCcw className="h-4 w-4" />
                  Reset account
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Equity</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(summary.equity)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Cash</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(summary.cash)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Unrealized P&L
          </p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${pnlTone(
              summary.unrealizedPnl
            )}`}
          >
            {summary.unrealizedPnl >= 0 ? "+" : ""}
            {formatPrice(summary.unrealizedPnl)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Total return
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`text-2xl font-bold tabular-nums ${pnlTone(
                summary.totalReturn
              )}`}
            >
              {summary.totalReturn >= 0 ? "+" : ""}
              {formatPrice(summary.totalReturn)}
            </span>
            <ChangeChip value={summary.totalReturnPercent} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Trade ticket</h2>
          <p className="text-sm text-muted-foreground">
            Market orders fill instantly at the latest quote.
            {ticketQuote &&
              ` ${ticketQuote.symbol} is at ${formatPrice(ticketQuote.price)}.`}
          </p>
        </div>
        <form
          action={placePaperTrade}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="grid gap-1.5">
            <label htmlFor="trade-symbol" className="text-xs font-medium">
              Symbol
            </label>
            <input
              id="trade-symbol"
              name="symbol"
              required
              maxLength={12}
              defaultValue={ticketSymbol}
              placeholder="AAPL"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-32 rounded-full border px-4 text-sm uppercase shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="trade-shares" className="text-xs font-medium">
              Shares
            </label>
            <input
              id="trade-shares"
              name="shares"
              type="number"
              min="1"
              step="1"
              required
              placeholder="10"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-28 rounded-full border px-4 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              name="side"
              value="buy"
              className="rounded-full"
            >
              Buy
            </Button>
            <Button
              type="submit"
              name="side"
              value="sell"
              variant="outline"
              className="rounded-full"
            >
              Sell
            </Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">Positions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open positions valued at the latest quote.
          </p>
        </div>
        {positionRows.length === 0 ? (
          <div className="p-8 text-center">
            <CandlestickChart className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold">No positions yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Use the trade ticket above to buy your first stock with virtual
              cash.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Value
                </TableHead>
                <TableHead className="text-right">Unrealized P&L</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {positionRows.map((row) => (
                <TableRow key={row.symbol}>
                  <TableCell>
                    <Link
                      href={`/stock/${row.symbol}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {row.symbol}
                    </Link>
                    {row.error && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.shares, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(row.avgCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.quote ? formatPrice(row.quote.price) : "-"}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {row.marketValue === null
                      ? "-"
                      : formatPrice(row.marketValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.unrealizedPnl === null ||
                    row.unrealizedPnlPercent === null ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-sm font-semibold tabular-nums ${pnlTone(
                            row.unrealizedPnl
                          )}`}
                        >
                          {row.unrealizedPnl >= 0 ? "+" : ""}
                          {formatPrice(row.unrealizedPnl)}
                        </span>
                        <ChangeChip value={row.unrealizedPnlPercent} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <form action={placePaperTrade} className="flex justify-end">
                      <input type="hidden" name="symbol" value={row.symbol} />
                      <input type="hidden" name="shares" value={row.shares} />
                      <Button
                        type="submit"
                        name="side"
                        value="sell"
                        variant="ghost"
                        size="sm"
                        aria-label={`Sell all ${row.symbol}`}
                      >
                        Sell all
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {recentTrades.length > 0 && (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-end justify-between border-b p-5">
            <div>
              <h2 className="text-base font-semibold">Recent trades</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Last {recentTrades.length} fills.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/trading/history">Full history</Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Total
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Executed
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-semibold">{trade.symbol}</TableCell>
                  <TableCell className="capitalize">{trade.side}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(trade.shares, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(trade.price)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {formatPrice(trade.shares * trade.price)}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
                    {new Date(trade.executed_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both succeed

- [ ] **Step 3: Commit**

```bash
git add app/trading/page.tsx
git commit -m "Add paper trading page with ticket, positions, and summary"
```

---

### Task 9: /trading/history page

**Files:**
- Create: `app/trading/history/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/trading/history/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { EquityChart, type EquityPoint } from "@/components/equity-chart";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice } from "@/lib/format";
import {
  buildPaperPortfolio,
  DEFAULT_STARTING_CASH,
  type PaperTrade,
} from "@/lib/paper-trading";
import { createClient } from "@/lib/supabase/server";

function pnlTone(value: number) {
  return value >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

export default async function TradingHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trading/history");
  }

  const [
    { data: account },
    { data: tradeData, error: tradesError },
    { data: snapshotData, error: snapshotsError },
  ] = await Promise.all([
    supabase
      .from("paper_accounts")
      .select("id,starting_cash")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("paper_trades")
      .select("id,symbol,side,shares,price,executed_at")
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false }),
    supabase
      .from("paper_equity_snapshots")
      .select("snapshot_date,equity")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: true }),
  ]);

  if (tradesError) {
    throw new Error(tradesError.message);
  }
  if (snapshotsError) {
    throw new Error(snapshotsError.message);
  }

  const startingCash = account
    ? Number(account.starting_cash)
    : DEFAULT_STARTING_CASH;
  const trades = (tradeData ?? []).map((row) => ({
    ...row,
    shares: Number(row.shares),
    price: Number(row.price),
  })) as PaperTrade[];
  const portfolio = buildPaperPortfolio(trades);
  const points: EquityPoint[] = (snapshotData ?? []).map((row) => ({
    date: String(row.snapshot_date),
    equity: Number(row.equity),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Paper trading</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Trading history
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Equity over time, realized results, and every fill on record.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/trading">Back to trading</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Starting cash
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(startingCash)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Realized P&L
          </p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${pnlTone(
              portfolio.realizedPnl
            )}`}
          >
            {portfolio.realizedPnl >= 0 ? "+" : ""}
            {formatPrice(portfolio.realizedPnl)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Total fills
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {trades.length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Equity curve</h2>
          <p className="text-sm text-muted-foreground">
            One point per day you visited the trading page.
          </p>
        </div>
        <EquityChart points={points} />
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">Trade log</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every fill, newest first.
          </p>
        </div>
        {trades.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            No trades yet. Place your first order on the trading page.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Total
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Executed
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    <Link
                      href={`/stock/${trade.symbol}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {trade.symbol}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{trade.side}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(trade.shares, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(trade.price)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {formatPrice(trade.shares * trade.price)}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
                    {new Date(trade.executed_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both succeed

- [ ] **Step 3: Commit**

```bash
git add app/trading/history/page.tsx
git commit -m "Add trading history page with equity curve and trade log"
```

---

### Task 10: Navigation, middleware, and stock page entry point

**Files:**
- Modify: `proxy.ts`
- Modify: `components/app-sidebar.tsx`
- Modify: `app/stock/[symbol]/page.tsx`

- [ ] **Step 1: Protect /trading in the middleware**

In `proxy.ts`, add `"/trading"` to the array (covers `/trading/history` by prefix):

```ts
const PROTECTED_PATHS = [
  "/portfolio",
  "/watchlist",
  "/alerts",
  "/compare/saved",
  "/trading",
];
```

- [ ] **Step 2: Add the sidebar nav item**

In `components/app-sidebar.tsx`, add `CandlestickChart` to the lucide-react
import list, then insert one entry into `NAV_ITEMS` between Portfolio and
Alerts:

```ts
const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/trading", label: "Trading", icon: CandlestickChart },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/compare", label: "Compare", icon: ArrowRightLeft },
  { href: "/movers", label: "Movers", icon: Activity },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/news", label: "News", icon: Newspaper },
];
```

If `CandlestickChart` is missing from the installed lucide-react version,
use `LineChart` instead (same import and icon slot).

- [ ] **Step 3: Add a Trade button on the stock page**

In `app/stock/[symbol]/page.tsx`, the signed-in branch currently renders
only the Watch form. Wrap it so the Watch form gains a sibling Trade
button. Replace this block:

```tsx
            {user ? (
              <form action={toggleWatchlistItem}>
```

through the matching `</form>` with:

```tsx
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  asChild
                >
                  <Link href={`/trading?symbol=${symbol}`}>Trade</Link>
                </Button>
                <form action={toggleWatchlistItem}>
                  <input type="hidden" name="symbol" value={symbol} />
                  <input type="hidden" name="next" value={`/stock/${symbol}`} />
                  <Button
                    type="submit"
                    variant={watchlistItem ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-full"
                  >
                    <Star
                      className={watchlistItem ? "fill-current" : undefined}
                    />
                    {watchlistItem ? "Watching" : "Watch"}
                  </Button>
                </form>
              </div>
            ) : (
```

Keep the existing signed-out branch unchanged.

- [ ] **Step 4: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: both succeed

- [ ] **Step 5: Commit**

```bash
git add proxy.ts components/app-sidebar.tsx "app/stock/[symbol]/page.tsx"
git commit -m "Wire paper trading into nav, middleware, and stock page"
```

---

### Task 11: Docs, remote migration, and full verification

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: Update README.md**

In the Features list, add after the Portfolio bullet:

```markdown
- **Paper trading** (`/trading`): $100k virtual account, market-order buys
  and sells filled at live quotes, ledger-derived positions and P&L, equity
  curve at `/trading/history`, one-click account reset
```

In the setup step 3, extend the table list to: `watchlist_items`,
`holdings`, `price_alerts`, `saved_comparisons`, `paper_accounts`,
`paper_trades`, `paper_equity_snapshots`.

In Project layout, extend the routes line to include `/trading` and
`/trading/history`.

- [ ] **Step 2: Update CLAUDE.md**

In the Architecture section, update the `PROTECTED_PATHS` sentence to
include `/trading`. In the Database section, extend the tables sentence:
`watchlist_items`, `holdings`, `price_alerts`, `saved_comparisons`,
`paper_accounts`, `paper_trades`, `paper_equity_snapshots`, and add one
sentence: "Paper trading derives cash and positions from the
`paper_trades` ledger via `lib/paper-trading.ts`; never store derived
position state."

- [ ] **Step 3: Update docs/HANDOFF.md**

Add to the DONE list:

```markdown
- Paper trading feature DONE in current working tree (2026-07-05): three
  RLS-protected tables (`paper_accounts`, `paper_trades`,
  `paper_equity_snapshots`), ledger-derived portfolio math in
  `lib/paper-trading.ts` with unit tests, `/trading` page (ticket,
  positions, summary, reset), `/trading/history` (equity curve, trade
  log), Trading nav, middleware protection, and a stock page Trade
  button. Spec: `docs/superpowers/specs/2026-07-05-paper-trading-design.md`.
```

- [ ] **Step 4: Apply the remote Supabase migration**

Apply `supabase/migrations/20260705120000_create_paper_trading.sql` to the
remote project (ref `ofyyjzjjmopwvfqlhnyc`) through the Supabase MCP
apply-migration tool if connected, else note it as pending in
`docs/HANDOFF.md` NEXT UP. Record the outcome in `docs/HANDOFF.md`.

- [ ] **Step 5: Full verification**

Run: `npm test && npm run lint && npm run build`
Expected: all pass (61+ tests)

Check: `grep -c $'\342\200\224' lib/paper-trading.ts app/trading/*.tsx app/trading/*.ts components/equity-chart.tsx` reports 0 for every file (the escape is the em dash byte sequence; the ban applies to these docs too, so the character itself must not appear here).

- [ ] **Step 6: Commit**

```bash
git add README.md CLAUDE.md docs/HANDOFF.md
git commit -m "Document paper trading feature"
```

---

### Task 12: new-changes mirror refresh

**Files:**
- Modify: `/Users/nbangalorevenugo/Desktop/market-cap/new-changes/` (outside the repo)

- [ ] **Step 1: Copy all paper trading files into the mirror**

```bash
cd /Users/nbangalorevenugo/Desktop/market-cap/market-cap
DEST=../new-changes/market-cap
mkdir -p $DEST/app/trading/history $DEST/supabase/migrations $DEST/docs/superpowers/plans
cp supabase/migrations/20260705120000_create_paper_trading.sql $DEST/supabase/migrations/
cp lib/paper-trading.ts lib/paper-trading.test.mjs lib/migrations.test.mjs $DEST/lib/
cp app/trading/actions.ts app/trading/page.tsx $DEST/app/trading/
cp app/trading/history/page.tsx $DEST/app/trading/history/
cp components/equity-chart.tsx components/app-sidebar.tsx $DEST/components/
mkdir -p "$DEST/app/stock/[symbol]"
cp "app/stock/[symbol]/page.tsx" "$DEST/app/stock/[symbol]/"
cp proxy.ts README.md CLAUDE.md $DEST/
cp docs/HANDOFF.md $DEST/docs/
cp docs/superpowers/plans/2026-07-05-paper-trading.md $DEST/docs/superpowers/plans/
```

- [ ] **Step 2: Update the mirror README**

Extend the "paper trading feature" file map table in
`/Users/nbangalorevenugo/Desktop/market-cap/new-changes/README.md` with one
row per file copied in Step 1, each describing its destination path and a
one-line change summary (pattern: existing rows in that file).

---

## Manual smoke test (after all tasks)

With the dev server running and the test account signed in
(marketcap.test.user1@gmail.com, see docs/HANDOFF.md):

1. Visit `/trading` while signed out: expect redirect to `/login?next=/trading`.
2. Sign in, buy 10 AAPL: cash drops by 10x the quote, position appears.
3. Buy 5 more AAPL: shares 15, avg cost re-averaged.
4. Sell 5 AAPL: realized P&L appears on `/trading/history`.
5. Try selling 999 AAPL: error page with "Not enough shares to sell" (known
   rough edge: server action errors render the error boundary).
6. `/trading/history`: equity curve shows today's point, trade log lists fills.
7. Reset account: positions and history empty, cash back to $100,000.
8. Delete any test rows if using the shared test account when done.
