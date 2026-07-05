# Price Alerts Design

## Goal

Add a protected price alerts feature so signed-in users can create target-price rules for US symbols and review whether each alert is watching, triggered, paused, or unavailable.

## Scope

- Add a Supabase `price_alerts` table with RLS, authenticated CRUD grants, and user-owned policies.
- Add alert helper logic in `lib/alerts.ts` for validation, row building, trigger evaluation, and summary counts.
- Add `/alerts` as a protected page with a compact summary, an alerts table, and add/edit/delete/toggle controls.
- Add Alerts to desktop and mobile navigation.
- Document the feature in `HANDOFF.md`.

## Non-Goals

- No push notifications, emails, cron jobs, or background workers.
- No intraday alert history beyond `triggered_at`.
- No support for non-US symbols.

## Data Model

`public.price_alerts`:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `symbol text not null check (symbol ~ '^[A-Z0-9.\^-]{1,12}$')`
- `direction text not null check (direction in ('above', 'below'))`
- `target_price numeric not null check (target_price > 0)`
- `active boolean not null default true`
- `triggered_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- `price_alerts_user_id_idx` on `user_id`
- `price_alerts_active_user_id_idx` on `user_id, created_at desc` where `active`

RLS:

- `TO authenticated` policies for select, insert, update, delete.
- Ownership predicate: `(select auth.uid()) = user_id`.
- The app also filters all alerts queries with `.eq("user_id", user.id)`.

## UX

The `/alerts` page follows the existing Portfolio and Watchlist patterns:

- Header with title, short description, and Add alert dialog.
- Three summary cards: active, triggered, paused.
- Empty state with a link to open a stock page.
- Table columns: symbol, rule, current price, distance, status, controls.
- Row controls: toggle active, edit, delete.

The UI stays operational and quiet. Alerts are a working tool, not a marketing surface.

## Testing

- Migration test verifies table, checks, grants, indexes, and RLS policies.
- Helper tests verify input normalization, invalid values, above/below trigger math, quote failures, paused alerts, and summary counts.
- Full verification remains `npm test && npm run lint && npm run build`.
