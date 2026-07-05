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
