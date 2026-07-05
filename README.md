# MarketCap

A Google Finance style stock market web app. Live prices, charts, market news,
watchlists, portfolio tracking, price alerts, stock comparison, market movers,
and a market calendar for US stocks.

## Features

- **Dashboard** (`/`): SPY/QQQ/DIA index cards, watchlist preview, market news
- **Stock detail** (`/stock/[symbol]`): live price (Finnhub websocket with
  polling fallback), range chart with SMA/EMA/Bollinger/RSI/MACD overlays,
  key stats, company news, a DCF calculator, and a beta-based volatility
  simulator (`/stock/[symbol]/volatility`); Watch, Trade, and Add to
  portfolio buttons
- **Watchlist** (`/watchlist`): saved symbols with live quotes and 7-day
  sparklines
- **Portfolio** (`/portfolio`): holdings with cost basis, market value, and
  P/L, a value-over-time chart, and a dividend-income tab; holdings can be
  added from the portfolio page or from any stock page (symbol and current
  price prefilled); **Allocation**
  (`/portfolio/allocation`) adds position weights and concentration;
  **Risk Diagnostics** (`/portfolio/risk`) shows weighted beta and HHI
- **Paper trading** (`/trading`): $100k virtual account, market-order buys
  and sells filled at live quotes, ledger-derived positions and P&L, equity
  curve at `/trading/history`, one-click account reset
- **Price alerts** (`/alerts`): above/below target rules with pause/resume,
  evaluated against the latest quote
- **Compare** (`/compare`): rank 2 to 5 symbols by daily move; save reusable
  symbol sets at `/compare/saved`; side-by-side fundamentals at
  `/compare/matrix`
- **Screener** (`/screener`): filter a curated catalog by sector, market cap,
  and valuation
- **Movers** (`/movers`): curated baskets (Mega Cap, AI, Finance, ETFs) with
  top gainers and losers
- **News** (`/news`): general market feed with deterministic sentiment
  filters (bullish/bearish/neutral)
- **Calendar** (`/calendar`): US market holidays plus the Finnhub earnings
  calendar for the next 21 days, with symbol and watchlist filters

Watchlist, portfolio, paper trading, alerts, and saved comparisons require a
signed-in user; everything else is public.

## Stack

- Next.js 16 (App Router, TypeScript) deployed to Vercel
- Tailwind CSS v4 + shadcn/ui, Recharts for charts
- Supabase for auth (email/password) and Postgres with row level security
- Market data: Finnhub (quotes, search, profiles, news, earnings calendar,
  websocket) and Twelve Data (chart candles), both on free tiers
- Stripe for the Pro subscription ($20/month); see
  [docs/PAYMENTS.md](docs/PAYMENTS.md)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...     # server-only, used for locked paper-trading writes
   FINNHUB_API_KEY=...
   NEXT_PUBLIC_FINNHUB_API_KEY=...   # same Finnhub key, used by the client websocket
   TWELVEDATA_API_KEY=...
   STRIPE_SECRET_KEY=sk_test_...     # Stripe sandbox key for the Pro plan
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   APP_URL=http://localhost:3000      # or your deployed origin for Stripe redirects
   ```

3. Apply the SQL migrations in `supabase/migrations/` to your Supabase
   project (in filename order). Tables: `watchlist_items`, `holdings`,
   `price_alerts`, `saved_comparisons`, `paper_accounts`, `paper_trades`,
   `paper_equity_snapshots`, `stripe_customers`, all with RLS.

4. Run the dev server:

   ```bash
   npm run dev
   ```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (node test runner over `lib/**/*.test.mjs`) |

## Project layout

- `app/` - routes: dashboard (`/`), `/stock/[symbol]` (+ `/volatility`),
  `/watchlist`, `/portfolio` (+ `/allocation`, `/risk`), `/alerts`,
  `/compare` (+ `/saved`, `/matrix`), `/screener`, `/trading`
  (+ `/history`), `/movers`, `/calendar`, `/news`, auth pages, and API
  routes under `/api` (market-data proxies plus `/api/screener`,
  `/api/compare/matrix`, `/api/stock/[symbol]/beta`)
- `components/` - app components plus `components/ui/` (shadcn)
- `lib/` - pure helpers with unit tests beside them; `lib/market/` wraps the
  Finnhub and Twelve Data APIs (server only)
- `hooks/useLivePrice.ts` - Finnhub websocket with polling fallback
- `proxy.ts` - Next middleware: Supabase session refresh + protected routes
- `supabase/migrations/` - database schema (RLS on every table)
- `docs/` - project docs, including the session handoff (`docs/HANDOFF.md`)
  and feature plans/specs under `docs/superpowers/`

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests, and build on
pushes and pull requests to `main`. A final "Run smoke" step boots the
production server and checks it serves `/login`; it is skipped until the
repo secrets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `FINNHUB_API_KEY`,
`NEXT_PUBLIC_FINNHUB_API_KEY`, and `TWELVEDATA_API_KEY` are configured
(Settings -> Secrets and variables -> Actions).
