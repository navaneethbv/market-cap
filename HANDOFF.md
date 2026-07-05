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

## State: NEXT UP

Phase 4 Watchlist:
1. Supabase migration `watchlist_items` (id uuid pk, user_id uuid refs
   auth.users, symbol text, created_at, unique(user_id, symbol), RLS user_id =
   auth.uid()) via mcp supabase apply_migration.
2. Star button on stock page.
3. `/watchlist` table page with quotes and change chips.
4. Verify authenticated add/remove and RLS isolation with the test account.

Then:
- Phase 5 Portfolio: `holdings` table (shares numeric, avg_cost numeric,
  purchased_at), CRUD dialogs, P/L math, /portfolio page.
- Phase 6: `hooks/useLivePrice.ts` Finnhub websocket
  (wss://ws.finnhub.io?token=NEXT_PUBLIC key, subscribe {"type":"subscribe",
  "symbol":"AAPL"}), merge trades into state, 15s polling fallback via
  /api/quote when socket down or market closed.
- Phase 7: dashboard home (index ETF cards SPY/QQQ/DIA, watchlist summary,
  news), empty/loading states, deploy via Vercel.

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
