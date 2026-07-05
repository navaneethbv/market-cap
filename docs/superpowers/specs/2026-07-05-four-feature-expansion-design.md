# Four Feature Expansion Design

## Goal

Add four focused product features to MarketCap without changing the core architecture: portfolio allocation, saved comparisons, news sentiment filters, and a market calendar.

## Scope

### Portfolio Allocation

- Add authenticated `/portfolio/allocation`.
- Reuse existing holdings reads and quote fetching from the portfolio page.
- Add pure helpers for position weights, largest position, total value, and concentration labels.
- Show allocation summary cards and a position-weight table.
- Add a link from `/portfolio` and a sidebar item if the existing navigation still has room.

### Saved Comparisons

- Add a Supabase table named `saved_comparisons`.
- Store `id`, `user_id`, `name`, `symbols`, `created_at`, and `updated_at`.
- Enable RLS and ownership policies for authenticated users.
- Grant table access to `authenticated` so the table is exposed to the Data API when needed.
- Add server actions to save, rename, and delete comparisons.
- Add `/compare/saved` for the authenticated saved list.
- Add a save form on `/compare` that appears for signed-in users.

### News Sentiment Filter

- Add deterministic keyword sentiment helpers in `lib/news-sentiment.ts`.
- Classify market news as bullish, bearish, neutral, or unavailable.
- Add `sentiment` query filtering to `/news`.
- Keep the first slice dependency-free, with no AI or paid sentiment API.

### Market Calendar

- Add public `/calendar`.
- Show a local static market holiday helper for the current year.
- Show a simple upcoming earnings section using existing Finnhub client capabilities when available.
- If provider data is unavailable, render a clear unavailable state rather than failing the page.

## Non-Goals

- No new paid data provider.
- No AI sentiment calls.
- No portfolio sector enrichment in this slice.
- No recurring jobs or notification emails.
- No custom calendar subscriptions.

## Architecture

- Keep route pages as server components.
- Put feature math and parsing in focused `lib/*.ts` helpers with matching `*.test.mjs` files.
- Keep Supabase mutations in `app/compare/saved/actions.ts`.
- Add only one migration, for `saved_comparisons`.
- Use existing shadcn/ui components and existing formatting helpers.

## Data Model

`saved_comparisons`:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `symbols text[] not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- `array_length(symbols, 1)` must be between 2 and 5.
- Symbols must be normalized in application code before insert.
- `name` must be trimmed and non-empty.

RLS:

- Authenticated users can select, insert, update, and delete only rows where `user_id = auth.uid()`.
- Update policy must include both `USING` and `WITH CHECK`.

## UX

Portfolio allocation should feel like a natural extension of the portfolio page: summary cards first, then a scannable table sorted by largest position weight.

Saved comparisons should make `/compare` feel durable without complicating the public compare flow. Signed-in users get a small save form, and saved sets live on `/compare/saved`.

News sentiment filters should be simple tabs or link buttons above the news list. Each article can show a small sentiment badge.

Market calendar should be a concise planning page: upcoming holidays, earnings, and provider status in one screen.

## Error Handling

- Missing quote data should not break allocation rows.
- Empty portfolios should link back to `/portfolio`.
- Saved comparison actions must return or redirect with user-safe errors for invalid names, invalid symbols, unauthenticated access, and unauthorized row edits.
- News with no useful keywords should be neutral.
- Calendar provider failures should render unavailable cards.

## Testing

- `lib/allocation.test.mjs` covers weight calculation, largest position, empty holdings, and unavailable quote rows.
- `lib/saved-comparisons.test.mjs` covers name normalization, symbol normalization, limits, and invalid inputs.
- `lib/news-sentiment.test.mjs` covers bullish, bearish, neutral, mixed, and unavailable classification.
- `lib/calendar.test.mjs` covers holiday generation and earnings row shaping.
- `lib/migrations.test.mjs` covers the `saved_comparisons` table, RLS, ownership policies, and grants.
- Full verification remains `npm test && npm run lint && npm run build`.

## Rollout

1. Commit this design.
2. Commit an implementation plan.
3. Build and commit Portfolio Allocation.
4. Build and commit Saved Comparisons.
5. Build and commit News Sentiment Filter.
6. Build and commit Market Calendar.
7. Update `HANDOFF.md` with every pushed commit and verification result.
