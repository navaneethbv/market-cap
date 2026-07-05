# MarketCap: Session Handoff

Continuation notes for resuming work. Read this plus the approved plan at
`~/.claude/plans/i-want-to-build-hidden-yeti.md` (also summarized below).

This file now lives at `docs/HANDOFF.md` (moved from the repo root during the
2026-07-04 hardening pass).

## What this project is

"MarketCap", a Google Finance style web app. Next.js 16.2 (App Router, TS),
Tailwind v4 + shadcn/ui (radix-nova preset), Supabase (auth + Postgres + RLS),
Recharts, deploy target Vercel. US stocks only, free API tiers.

Data providers:
- Finnhub (quotes, search, profile, metrics, news, websocket). 60 calls/min.
- Twelve Data (chart candles). 8 credits/min, 800/day.
- Keys are filled in `.env.local` (gitignored). Finnhub key duplicated as
  NEXT_PUBLIC_FINNHUB_API_KEY for the future client-side websocket (accepted
  trade-off, noted in plan).

## Design direction (user-approved)

Reference images in `img/` (committed). Blend of two dribbble shots:
- Light mode = "Investa": soft gray canvas, white rounded cards (radius 1rem),
  violet primary, left sidebar with pill active state, soft green/red change
  chips, Plus Jakarta Sans.
- Dark mode = "Omega": obsidian background, glassy cards, subtle borders,
  same layout. Theme toggle (next-themes) at sidebar bottom.
- User granted flexibility to upgrade the design further.
- Tokens live in `app/globals.css` (:root and .dark, oklch).
- `components/change-chip.tsx` = green/red delta pill used everywhere.

## State: DONE so far (all committed on main)

- Phase 1 DONE: scaffold, shadcn init + components, Supabase email/password
  auth (login/signup/confirm/signout), proxy.ts (Next 16 middleware) with
  session refresh + protected routes (/portfolio, /watchlist), open-redirect
  fix on `next` param. Verified via Playwright: signup, SQL-confirm, login.
- Phase 2 DONE: `lib/market/finnhub.ts` (getQuote, searchSymbols, getProfile,
  getKeyMetrics, getCompanyNews, getMarketNews), `lib/market/twelvedata.ts`
  (getCandles, ranges 1D/1W/1M/6M/1Y/5Y), `lib/market/types.ts`. API routes:
  /api/search, /api/quote (batch via ?symbols=), /api/candles. Debounced
  typeahead SearchBox in topbar. All verified with real data via curl.
- Design shell DONE: AppSidebar + MobileNav (components/app-sidebar.tsx),
  Topbar (topbar.tsx), ThemeProvider/ThemeToggle, layout.tsx with
  Plus Jakarta Sans. Both themes screenshot-verified.
- `lib/format.ts` just created (formatPrice, formatCompact, formatNumber,
  timeAgo).
- Phase 3 DONE: stock detail page at `/stock/[symbol]`, Recharts range chart,
  reusable news list, and populated `/news` page. Verified `/stock/AAPL` with
  real quote/candle/news data and Chrome headless screenshots in light and dark
  themes.
- Phase 4 DONE in current working tree: `watchlist_items` migrations, RLS and
  grants, stock page Watch button, `/watchlist` table page, authenticated
  add/remove smoke test, and RLS isolation smoke test. Remote Supabase
  migrations applied: `create_watchlist_items` and
  `harden_watchlist_item_privileges`.
- Phase 5 DONE in current working tree: `holdings` table migration with RLS,
  `/portfolio` page, add/edit/delete holding dialogs, server actions, and P/L
  math in `lib/portfolio.ts`. Remote Supabase migrations applied:
  `create_holdings`, `drop_unused_holdings_symbol_idx`, and
  `default_holdings_purchased_at`. Authenticated CRUD, cross-user insert
  rejection, and signed-in app route smoke tests were run with the test account.
- Phase 6 DONE in current working tree: `hooks/useLivePrice.ts` connects to the
  Finnhub websocket using `NEXT_PUBLIC_FINNHUB_API_KEY`, merges trade ticks into
  quote state, and falls back to `/api/quote` polling every 15 seconds. Stock
  detail page now shows the live price status.
- Phase 7 DONE in current working tree: dashboard home page now shows SPY/QQQ/DIA
  cards, watchlist summary, and market news using existing market helpers.
- Price alerts feature DONE on main: `price_alerts` migration with RLS and
  authenticated CRUD grants, `/alerts` page, add/edit/delete/pause/resume
  actions, Alerts navigation, and quote-based alert status helpers. Remote
  Supabase migration applied: `create_price_alerts`. Authenticated CRUD,
  cross-user insert rejection, unauthenticated redirect, and signed-in route
  smoke tests were run with the test account.
- Stock compare feature DONE on main: `/compare` public page compares two to
  five symbols from the `symbols` query string, ranks quotes by daily percent
  move, shows best and weakest movers, and adds Compare navigation and a
  dashboard call-to-action. No new database tables were added.
- Market Movers feature DONE on main: `/movers` public page shows curated
  market baskets, top gainers and losers, summary cards, and a full detail
  table. Added Movers navigation and a dashboard shortcut. No new database
  tables were added.
- Four feature expansion DONE on main:
  - Portfolio Allocation: authenticated `/portfolio/allocation` with position
    weights, largest holding, concentration status, and allocation table.
  - Saved Comparisons: authenticated `/compare/saved`, save form on `/compare`,
    rename/delete actions, and `saved_comparisons` Supabase table with RLS.
    Remote Supabase migration applied: `create_saved_comparisons`.
  - News Sentiment Filter: `/news?sentiment=...` filters with deterministic
    bullish, bearish, neutral, and unavailable classification badges.
  - Market Calendar: public `/calendar` with US market holidays and Finnhub
    earnings calendar rows. Added Calendar navigation and dashboard shortcut.
- TDD pass added: local tests now cover format helpers, stock display, watchlist
  helpers, migration expectations, portfolio math, live price reducers,
  dashboard summaries, price alert trigger logic, stock comparison helpers,
  market mover helpers, allocation math, saved comparison validation,
  sentiment classification, and calendar helpers.
- Fixed an existing next-themes hydration warning by suppressing expected
  theme-toggle button attribute mismatches. Playwright recheck showed no console
  errors afterward.
- Review and hardening pass DONE in current working tree (2026-07-04):
  - `hooks/useLivePrice.ts`: dropped `initialQuote` from the effect deps (it
    is not read inside the effect) so server re-renders such as a Watch
    toggle no longer tear down and reconnect the Finnhub websocket; wrapped
    the websocket `JSON.parse` in try/catch so a malformed frame cannot throw
    an uncaught error.
  - `components/search-box.tsx`: guarded `setResults`/`setOpen` behind the
    effect's `active` flag so a slow search response cannot reopen the
    dropdown after the user clicked away or cleared the query.
  - `app/watchlist/actions.ts`: a concurrent double toggle could pass the
    exists check twice and the second insert failed the
    `unique (user_id, symbol)` constraint with an unhandled 500; unique
    violations (Postgres 23505) are now treated as success.
  - Deduplicated formatters: `lib/format.ts` gained `formatPriceOrDash`
    (zero/non-finite render as "-"); `lib/stock-display.ts` and
    `components/stock-chart.tsx` now import from `lib/format.ts` instead of
    carrying private copies of `formatPrice`/`formatCompact`.
  - Simplified `lib/dashboard.ts`: `TIndex extends { symbol: string }`
    replaces the unconstrained generic plus runtime type sniffing.
  - Added `formatPriceOrDash` unit tests in `lib/format.test.mjs`.
  - Moved `HANDOFF.md` to `docs/HANDOFF.md`; replaced the create-next-app
    boilerplate `README.md` with real project docs (stack, env vars, setup,
    scripts, layout).
- Second hardening pass over the four-feature expansion DONE in current
  working tree (2026-07-04):
  - `app/compare/page.tsx`: the save form is only rendered with 2+ symbols
    (previously a single-symbol URL showed a Save button whose action always
    threw); the name input gained `required` and `maxLength={60}` so an empty
    name no longer reaches the server action and surfaces as an error page.
  - `app/compare/saved/page.tsx`: rename input gained `required` and
    `maxLength={60}` for the same reason.
  - `lib/saved-comparisons.ts`: `normalizeSavedComparisonInput` now rejects
    names over 60 characters (`MAX_COMPARISON_NAME_LENGTH`); previously the
    only bound was the DB non-empty check. Test added.
  - `proxy.ts`: added `/compare/saved` to `PROTECTED_PATHS` so the middleware
    covers it like every other authenticated route (the page still
    self-redirects as defense in depth).
- Docs refresh DONE in current working tree (2026-07-04): `README.md` now
  lists all features and routes including the four-feature expansion;
  `CLAUDE.md` was expanded from a bare `@AGENTS.md` import into full agent
  guidance (commands, architecture, server-action pattern, protected-route
  rule, migration recipe, .ts-extension test import rule, formatter policy,
  em dash house rule, handoff/ledger conventions). It still imports
  `@AGENTS.md` at the end for the Next.js 16 version warning.
- Paper trading feature DONE in current working tree (2026-07-05): three
  RLS-protected tables (`paper_accounts`, `paper_trades`,
  `paper_equity_snapshots`) in migration `20260705120000_create_paper_trading`,
  ledger-derived portfolio math in `lib/paper-trading.ts` with 14 unit tests,
  paginated trades fetch in `app/trading/data.ts`, `/trading` page (ticket,
  positions, summary, reset, daily equity snapshot upsert guarded against
  quote outages), `/trading/history` (equity curve, trade log), Trading nav,
  middleware protection, and a stock page Trade button. Spec:
  `docs/superpowers/specs/2026-07-05-paper-trading-design.md`. Built
  subagent-driven with two-stage review per task.
- Merge reconciliation DONE in current working tree (2026-07-05): merged the
  remote 76-file feature commit and reviewed every feature (four parallel
  review agents). Our ledger-based paper trading takes priority; the other
  paper trading (`paper_portfolios`/`paper_holdings`/`paper_transactions`,
  `lib/paper-portfolio`, `trade-dialog`, `paper-actions`) was removed.
  - REMOVED (unsound): AI advisor/analyst/chat + `stock_ai_summaries` (no
    GEMINI_API_KEY, world-writable shared cache); alert webhooks/notifications
    (SSRF via user webhook_url, no server-side price check, tab-only firing);
    leaderboard (mock competitors; real cross-user board impossible under
    RLS); correlation heatmap (Pearson over 10 hourly price levels + random
    fallback data); `todos.md`/`implements.md` stray root docs.
  - KEPT WITH FIXES: screener and comparison matrix (removed fake fallback
    tables, allSettled + omit failures), volatility simulator (beta via new
    `/api/stock/[symbol]/beta`, not the 30-symbol screener), risk diagnostics
    (reworked to a self-contained server component: real holdings, beta+HHI,
    dropped invented stress test), dividend income (dropped charCode payout
    calendar and mock-growth Chowder scatter), news sentiment panel (factual
    count summary, no fabricated blurb), calendar dashboard (dropped fake
    dividends tab, kept search/watchlist filter), watchlist sparkline (dash
    instead of random walk on failure), stock-chart indicators (memoized),
    mobile nav (scrollable). Indicators/DCF kept as-is (correct, no API cost).
  - The recurring merge defect was silent fabrication of data on failure;
    every instance was removed or replaced with an honest empty/dash state.

## Pushed commit ledger

Record every pushed commit here after each milestone.

- `b19bdff` Phase 3: add stock detail and news pages
  - Added `/stock/[symbol]`, range chart, reusable news list, and `/news`.
  - Verified stock detail with real quote, candle, and news data.
- `72d6422` Add CI workflow
  - Added GitHub Actions workflow for lint, tests, and build.
- `8695e5d` Add watchlist portfolio and dashboard phases
  - Added watchlist, portfolio holdings, live price fallback, dashboard, tests,
    and Supabase migrations for watchlist and holdings.
  - Applied remote Supabase migrations through MCP.
- `3964d38` Update handoff with CLI setup status
  - Recorded Vercel CLI and Supabase CLI setup state.
  - Noted Supabase `dummy` Edge Function cleanup blocker.
- `8dd9878` Document price alerts feature plan
  - Added price alerts design and implementation plan under `docs/superpowers`.
- `500ba4b` Add price alerts feature
  - Added `/alerts`, alert CRUD actions, pause/resume controls, alert helpers,
    tests, route protection, navigation, and `price_alerts` migration.
  - Applied remote Supabase `create_price_alerts` migration and smoke-tested
    authenticated CRUD plus RLS rejection.
- `0d6f162` Record pushed commits in handoff
  - Added this pushed commit ledger to `HANDOFF.md`.
- `ecb1e94` Document stock compare feature plan
  - Added stock compare design and implementation plan under `docs/superpowers`.
- `3dc092d` Add stock comparison page
  - Added `/compare`, comparison helper tests, quote ranking and summary logic,
    Compare navigation, and a dashboard Compare call-to-action.
  - Verified `/compare?symbols=AAPL,MSFT,NVDA` returned 200 and rendered the
    requested symbols.
- `badaf5f` Update handoff after stock compare
  - Recorded the stock compare feature, test coverage, route smoke, and pushed
    commit ledger entries through `3dc092d`.
- `80085ad` Document market movers feature plan
  - Added Market Movers design and implementation plan under
    `docs/superpowers`.
- `d5ada4f` Add market movers page
  - Added `/movers`, curated market baskets, top gainers and losers,
    market-mover summary helpers, tests, Movers navigation, and a dashboard
    Movers shortcut.
  - Verified `/movers?basket=ai` returned 200 and rendered Market movers, NVDA,
    AMD, and AVGO.
- `1893ed8` Update handoff after market movers
  - Recorded Market Movers status, route smoke, verification notes, and commit
    ledger entries through `d5ada4f`.
- `162d728` Document four feature expansion plan
  - Added the shared design spec for Portfolio Allocation, Saved Comparisons,
    News Sentiment Filter, and Market Calendar.
- `1e5d6d1` Plan four feature expansion
  - Added the TDD implementation plan for the four-feature expansion under
    `docs/superpowers`.
- `9a07a80` Add portfolio allocation view
  - Added `/portfolio/allocation`, allocation helpers, tests, and a Portfolio
    page shortcut.
- `4179443` Add saved comparisons
  - Added `saved_comparisons` migration, helper tests, `/compare/saved`,
    save/rename/delete actions, and a save form on `/compare`.
  - Applied remote Supabase `create_saved_comparisons` migration and verified
    RLS, ownership policies, and authenticated grants through MCP.
- `359d62b` Add news sentiment filters
  - Added deterministic sentiment helpers, tests, `/news?sentiment=...`
    filtering, counts, and sentiment badges on news cards.
- `93a175e` Add market calendar
  - Added `/calendar`, market holiday helpers, earnings calendar rows, tests,
    Calendar navigation, and a dashboard Calendar shortcut.
- `7c9223b` Add to portfolio from stock pages; CI run smoke step
  (branch `feature/add-to-portfolio`)
  - AddHoldingDialog accepts prefilled symbol/avg cost, a custom trigger,
    and an optional guarded `next`; stock pages gained an Add to portfolio
    button that prefills symbol and live price and lands on `/portfolio`.
  - CI gained a secrets-gated Run smoke step (`npm run start` then curl
    `/login`); add the data/Supabase repo secrets to enable it.
  - Browser-verified with MSFT (5 shares at the prefilled price); the test
    row was deleted afterwards. README and CLAUDE.md updated.

## State: NEXT UP

Recommended next steps:
1. Deploy via Vercel once the project is linked and env vars are synced.
2. Supabase security advisor still reports leaked password protection disabled:
   enable it in Auth settings when ready.
3. Supabase performance advisor may report `holdings_user_id_idx` as unused on
   the brand-new table; keep it because it backs RLS/user filters and FK
   cascade paths.
4. Remove the accidental Supabase Edge Function named `dummy` from the Supabase
   dashboard. It was created while trying to expose the migration tool; the MCP
   tools available here can list/deploy functions but do not expose delete.
   Supabase CLI is now installed, but `supabase functions delete dummy
   --project-ref ofyyjzjjmopwvfqlhnyc --yes` requires `supabase login` or
   `SUPABASE_ACCESS_TOKEN`.
5. Apply `supabase/migrations/20260705120000_create_paper_trading.sql` to the
   remote Supabase project (ref ofyyjzjjmopwvfqlhnyc). Not applied yet: no
   Supabase MCP or CLI login in the current session.
6. IMPORTANT (remote DB cleanup): the removed features' migrations may already
   have been applied to the remote project before this reconciliation. If so,
   drop these now-unused objects: tables `paper_portfolios`, `paper_holdings`,
   `paper_transactions` (their paper trading, migration
   `20260705000001`), table `stock_ai_summaries` (migration `20260705070000`),
   and the `notify_email`/`webhook_url` columns on `price_alerts` (migration
   `20260705000002`). The migration files are deleted from the repo, so a
   fresh DB will not create them; only an already-migrated remote needs manual
   cleanup. Verify what is actually present with the Supabase MCP before
   dropping anything.

## Practical notes

- Dev server: `npm run dev -- --port 3100` (background, log in scratchpad).
- Test account: marketcap.test.user1@gmail.com / TestPass123! (email was
  confirmed via SQL update on auth.users; Supabase MCP is connected,
  project ofyyjzjjmopwvfqlhnyc, tables currently empty).
- Supabase email confirmation is ON; confirm test users via
  `UPDATE auth.users SET email_confirmed_at = now() WHERE email = ...`.
- User wants incremental commits at every working milestone.
- User global rule: NEVER use em dash character anywhere in output.
- Playwright MCP screenshots land in repo root or .playwright-mcp/; delete
  before committing.
- shadcn CLI is v4-style: `npx shadcn@latest add <component> -y -s`.
- Verification last run after four feature expansion: `npm test`,
  `npm run lint`, and
  `npm run build` passed.
- Signed-in route smoke last run: inserted temporary MSFT watchlist and holding
  rows under the test account, verified `/watchlist`, `/portfolio`, and `/`
  returned 200 and rendered MSFT, then deleted those rows by inserted IDs.
- Alerts route smoke last run: inserted a temporary AAPL price alert under the
  test account, verified `/alerts` returned 200 and rendered AAPL, then deleted
  the row by inserted ID.
- Compare route smoke last run: requested
  `/compare?symbols=AAPL,MSFT,NVDA`, verified HTTP 200 and rendered AAPL, MSFT,
  and NVDA.
- Movers route smoke last run: requested `/movers?basket=ai`, verified HTTP 200
  and rendered Market movers, NVDA, AMD, and AVGO.
- Four feature route smoke last run:
  - `/calendar` returned HTTP 200 and rendered Market calendar plus Upcoming
    market dates.
  - `/news?sentiment=bullish` returned HTTP 200 and rendered Market news plus
    Bullish.
  - `/compare/saved` redirected unauthenticated users to
    `/login?next=/compare/saved`.
  - `/portfolio/allocation` redirected unauthenticated users to
    `/login?next=%2Fportfolio%2Fallocation`.
- Vercel CLI is installed (`54.20.1`) and logged in as `hotshot4ever-2393`.
  The project is not linked yet (`.vercel/` absent). Do not upload `.env.local`
  secrets to Vercel without explicit confirmation.
- Supabase CLI is installed (`2.109.0`), but not logged in.
