# MarketCap: Session Handoff

Continuation notes for resuming work. Read this plus the approved plan at
`~/.claude/plans/i-want-to-build-hidden-yeti.md` (also summarized below).

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
- TDD pass added: local tests now cover format helpers, stock display, watchlist
  helpers, migration expectations, portfolio math, live price reducers,
  dashboard summaries, and price alert trigger logic.
- Fixed an existing next-themes hydration warning by suppressing expected
  theme-toggle button attribute mismatches. Playwright recheck showed no console
  errors afterward.

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
- Verification last run after alerts: `npm test`, `npm run lint`, and
  `npm run build` passed.
- Signed-in route smoke last run: inserted temporary MSFT watchlist and holding
  rows under the test account, verified `/watchlist`, `/portfolio`, and `/`
  returned 200 and rendered MSFT, then deleted those rows by inserted IDs.
- Alerts route smoke last run: inserted a temporary AAPL price alert under the
  test account, verified `/alerts` returned 200 and rendered AAPL, then deleted
  the row by inserted ID.
- Vercel CLI is installed (`54.20.1`) and logged in as `hotshot4ever-2393`.
  The project is not linked yet (`.vercel/` absent). Do not upload `.env.local`
  secrets to Vercel without explicit confirmation.
- Supabase CLI is installed (`2.109.0`), but not logged in.
