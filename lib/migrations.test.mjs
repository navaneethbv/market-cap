import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

test("watchlist migration creates RLS-protected user-owned rows", async () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files.filter((file) => file.includes("watchlist"));

  assert.ok(migrationFiles.length > 0, "expected a watchlist migration file");

  const sql = (
    await Promise.all(
      migrationFiles.map((file) => readFile(join(migrationsDir, file), "utf8"))
    )
  ).join("\n");
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  assert.match(normalized, /create table if not exists public\.watchlist_items/);
  assert.match(
    normalized,
    /user_id uuid not null references auth\.users\(id\) on delete cascade/
  );
  assert.match(normalized, /unique\s*\(\s*user_id\s*,\s*symbol\s*\)/);
  assert.match(
    normalized,
    /grant select, insert, delete on table public\.watchlist_items to authenticated/
  );
  assert.match(
    normalized,
    /revoke all on table public\.watchlist_items from anon/
  );
  assert.match(
    normalized,
    /revoke all on table public\.watchlist_items from authenticated/
  );
  assert.match(
    normalized,
    /alter table public\.watchlist_items enable row level security/
  );
  assert.match(normalized, /for select to authenticated using/);
  assert.match(normalized, /for insert to authenticated with check/);
  assert.match(normalized, /for delete to authenticated using/);
  assert.match(normalized, /\(select auth\.uid\(\)\) = user_id/);
});

test("portfolio migration creates RLS-protected holdings", async () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files.filter((file) => file.includes("holdings"));

  assert.ok(migrationFiles.length > 0, "expected a holdings migration file");

  const sql = (
    await Promise.all(
      migrationFiles.map((file) => readFile(join(migrationsDir, file), "utf8"))
    )
  ).join("\n");
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  assert.match(normalized, /create table if not exists public\.holdings/);
  assert.match(
    normalized,
    /user_id uuid not null references auth\.users\(id\) on delete cascade/
  );
  assert.match(normalized, /shares numeric not null/);
  assert.match(normalized, /avg_cost numeric not null/);
  assert.match(normalized, /purchased_at date not null/);
  assert.match(
    normalized,
    /purchased_at date not null default current_date|alter table public\.holdings alter column purchased_at set default current_date/
  );
  assert.match(
    normalized,
    /create index if not exists holdings_user_id_idx on public\.holdings \(user_id\)/
  );
  assert.match(
    normalized,
    /revoke all on table public\.holdings from anon/
  );
  assert.match(
    normalized,
    /grant select, insert, update, delete on table public\.holdings to authenticated/
  );
  assert.match(
    normalized,
    /alter table public\.holdings enable row level security/
  );
  assert.match(normalized, /for select to authenticated using/);
  assert.match(normalized, /for insert to authenticated with check/);
  assert.match(normalized, /for update to authenticated using/);
  assert.match(normalized, /for delete to authenticated using/);
  assert.match(normalized, /\(select auth\.uid\(\)\) = user_id/);
});

test("alerts migration creates RLS-protected price alerts", async () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files.filter((file) => file.includes("price_alerts"));

  assert.ok(migrationFiles.length > 0, "expected a price alerts migration file");

  const sql = (
    await Promise.all(
      migrationFiles.map((file) => readFile(join(migrationsDir, file), "utf8"))
    )
  ).join("\n");
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  assert.match(normalized, /create table if not exists public\.price_alerts/);
  assert.match(
    normalized,
    /user_id uuid not null references auth\.users\(id\) on delete cascade/
  );
  assert.match(normalized, /direction text not null/);
  assert.match(normalized, /direction in \('above', 'below'\)/);
  assert.match(normalized, /target_price numeric not null/);
  assert.match(normalized, /active boolean not null default true/);
  assert.match(
    normalized,
    /create index if not exists price_alerts_user_id_idx on public\.price_alerts \(user_id\)/
  );
  assert.match(
    normalized,
    /create index if not exists price_alerts_active_user_id_idx on public\.price_alerts \(user_id, created_at desc\) where active/
  );
  assert.match(
    normalized,
    /revoke all on table public\.price_alerts from anon/
  );
  assert.match(
    normalized,
    /grant select, insert, update, delete on table public\.price_alerts to authenticated/
  );
  assert.match(
    normalized,
    /alter table public\.price_alerts enable row level security/
  );
  assert.match(normalized, /for select to authenticated using/);
  assert.match(normalized, /for insert to authenticated with check/);
  assert.match(normalized, /for update to authenticated using/);
  assert.match(normalized, /for delete to authenticated using/);
  assert.match(normalized, /\(select auth\.uid\(\)\) = user_id/);
});

test("saved comparisons migration creates RLS-protected user-owned comparisons", async () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files.filter((file) =>
    file.includes("saved_comparisons")
  );

  assert.ok(
    migrationFiles.length > 0,
    "expected a saved comparisons migration file"
  );

  const sql = (
    await Promise.all(
      migrationFiles.map((file) => readFile(join(migrationsDir, file), "utf8"))
    )
  ).join("\n");
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  assert.match(normalized, /create table if not exists public\.saved_comparisons/);
  assert.match(
    normalized,
    /user_id uuid not null references auth\.users\(id\) on delete cascade/
  );
  assert.match(normalized, /name text not null/);
  assert.match(normalized, /symbols text\[\] not null/);
  assert.match(
    normalized,
    /array_length\(symbols, 1\) between 2 and 5/
  );
  assert.match(
    normalized,
    /create index if not exists saved_comparisons_user_id_idx on public\.saved_comparisons \(user_id\)/
  );
  assert.match(
    normalized,
    /revoke all on table public\.saved_comparisons from anon/
  );
  assert.match(
    normalized,
    /grant select, insert, update, delete on table public\.saved_comparisons to authenticated/
  );
  assert.match(
    normalized,
    /alter table public\.saved_comparisons enable row level security/
  );
  assert.match(normalized, /for select to authenticated using/);
  assert.match(normalized, /for insert to authenticated with check/);
  assert.match(normalized, /for update to authenticated using/);
  assert.match(normalized, /for delete to authenticated using/);
  assert.match(normalized, /\(select auth\.uid\(\)\) = user_id/);
});

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
  assert.match(normalized, /symbol text not null check \(symbol ~ /);
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

  assert.ok(
    normalized.indexOf("revoke all on table public.paper_accounts") <
      normalized.indexOf(
        "grant select, insert on table public.paper_accounts"
      )
  );
  assert.ok(
    normalized.indexOf("revoke all on table public.paper_trades") <
      normalized.indexOf(
        "grant select, insert, delete on table public.paper_trades"
      )
  );
  assert.ok(
    normalized.indexOf("revoke all on table public.paper_equity_snapshots") <
      normalized.indexOf(
        "grant select, insert, update, delete on table public.paper_equity_snapshots"
      )
  );

  assert.match(
    normalized,
    /on public\.paper_accounts for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.paper_accounts for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.paper_trades for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.paper_trades for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.paper_trades for delete to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.paper_equity_snapshots for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.paper_equity_snapshots for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.paper_equity_snapshots for update to authenticated using \(\(select auth\.uid\(\)\) = user_id\) with check \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.paper_equity_snapshots for delete to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/
  );

  assert.ok(!/on public\.paper_trades for update/.test(normalized));
  assert.ok(!/on public\.paper_accounts for update/.test(normalized));
});

test("paper trading hardening migration removes direct writes and adds locked RPCs", async () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files.filter((file) => file.endsWith(".sql"));

  const sql = (
    await Promise.all(
      migrationFiles.map((file) => readFile(join(migrationsDir, file), "utf8"))
    )
  ).join("\n");
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  assert.match(
    normalized,
    /revoke insert, update, delete on table public\.paper_accounts from authenticated/
  );
  assert.match(
    normalized,
    /revoke insert, update, delete on table public\.paper_trades from authenticated/
  );
  assert.match(
    normalized,
    /revoke insert, update, delete on table public\.paper_equity_snapshots from authenticated/
  );
  assert.match(
    normalized,
    /create or replace function public\.place_paper_trade/
  );
  assert.match(
    normalized,
    /create or replace function public\.reset_paper_account/
  );
  assert.match(
    normalized,
    /create or replace function public\.upsert_paper_equity_snapshot/
  );
  assert.match(normalized, /pg_advisory_xact_lock/);
  assert.match(normalized, /grant execute on function public\.place_paper_trade/);
  assert.match(normalized, /to service_role/);
  assert.doesNotMatch(
    normalized,
    /grant execute on function public\.place_paper_trade.*to authenticated/
  );
});

test("stripe customers migration creates RLS-protected customers table", async () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files.filter((file) =>
    file.includes("create_stripe_customers")
  );

  assert.ok(
    migrationFiles.length > 0,
    "expected a stripe customers migration file"
  );

  const sql = (
    await Promise.all(
      migrationFiles.map((file) => readFile(join(migrationsDir, file), "utf8"))
    )
  ).join("\n");
  const normalized = sql.toLowerCase().replace(/\s+/g, " ");

  assert.match(normalized, /create table if not exists public\.stripe_customers/);
  assert.match(
    normalized,
    /user_id uuid primary key references auth\.users\(id\) on delete cascade/
  );
  assert.match(
    normalized,
    /stripe_customer_id text not null unique check \(stripe_customer_id ~ '\^cus_\[a-za-z0-9\]\+\$'\)/
  );
  assert.match(
    normalized,
    /revoke all on table public\.stripe_customers from anon/
  );
  assert.match(
    normalized,
    /revoke all on table public\.stripe_customers from authenticated/
  );
  assert.match(
    normalized,
    /grant select, insert, update on table public\.stripe_customers to authenticated/
  );
  assert.match(
    normalized,
    /alter table public\.stripe_customers enable row level security/
  );
  assert.match(
    normalized,
    /on public\.stripe_customers for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.stripe_customers for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/
  );
  assert.match(
    normalized,
    /on public\.stripe_customers for update to authenticated using \(\(select auth\.uid\(\)\) = user_id\) with check \(\(select auth\.uid\(\)\) = user_id\)/
  );
});
