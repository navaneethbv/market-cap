# MarketCap

A Google Finance style stock market web app. Live prices, charts, market news,
watchlists, portfolio tracking, price alerts, stock comparison, market movers,
and a market calendar for US stocks.

## Features

- **Universal Command Palette** (`⌘K` / `Ctrl+K`): Instant ticker search with live quote previews, deep link page navigation, and quick theme toggling.
- **Stock detail** (`/stock/[symbol]`): live price through the server quote
  proxy, multi-mode chart (Area, Candlesticks with wicks, Line) with volume sub-chart and customizable SMA/EMA/RSI indicator settings,
  quarterly earnings surprise history (EPS actuals vs estimates, beat rates),
  key stats, company news, a DCF calculator, and a beta-based volatility
  simulator (`/stock/[symbol]/volatility`); Watch, Trade, and Add to
  portfolio buttons.
- **Watchlist** (`/watchlist`): saved symbols with live quotes and 7-day
  sparklines.
- **Portfolio** (`/portfolio`): holdings with cost basis, market value, and
  P/L, a value-over-time chart, and a dividend-income tab; CSV Import and Export;
  **Allocation** (`/portfolio/allocation`) position weights;
  **Target Allocation Rebalancer** (`/portfolio/rebalance`) for equal weighting and target rebalance trade plans;
  **Risk Diagnostics** (`/portfolio/risk`) with weighted beta, HHI concentration, and Monte Carlo simulations (`/portfolio/risk/simulations`).
- **Dividend Snowball** (`/portfolio/snowball`): Compounding and DRIP simulation planner.
- **Paper trading** (`/trading`): $100k virtual account with Market, Limit, and Stop-Loss orders, ledger-derived positions and P&L, equity curve at `/trading/history`, and 1-click CSV trade history export.
- **Price alerts & In-App Notifications** (`/alerts`): above/below target price rules, in-app notification bell with live trigger counter in the top bar.
- **Compare** (`/compare`): rank 2 to 5 symbols by daily move; multi-factor Stock Radar Chart comparing Valuation, Profitability, Growth, Momentum, and Stability; save reusable sets at `/compare/saved`; side-by-side fundamentals at `/compare/matrix`; correlation heatmap at `/compare/correlation`.
- **Backtesting Engine** (`/backtest`): Strategy simulator supporting SMA Crossover and RSI Threshold models.
- **Screener** (`/screener`): filter by sector, market cap, valuation, and beta risk, with instant CSV result export.
- **Movers** (`/movers`): curated baskets (Mega Cap, AI, Finance, ETFs) with
  top gainers and losers.
- **News** (`/news`): general market feed with deterministic sentiment
  filters (bullish/bearish/neutral).
- **Calendar** (`/calendar`): US market holidays plus Finnhub earnings calendar with symbol/watchlist filtering.
- **Insider Trading** (`/insiders`): SEC Form 4 insider transactions tracker.
- **Stripe Billing Portal** (`/pricing`): Pro subscription checkout and self-serve customer billing portal.

For in-depth architectural and mathematical details, see [docs/FEATURES.md](docs/FEATURES.md).

## Stack

- Next.js 16 (App Router, TypeScript) deployed to Vercel
- Tailwind CSS v4 + shadcn/ui, Recharts for charts
- Supabase for auth (email/password) and Postgres with row level security
- Market data: Finnhub (quotes, search, profiles, news, earnings calendar)
  and Twelve Data (chart candles), both on free tiers
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
   # No client-side Finnhub key is required. Live prices use /api/quote.
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
- `hooks/useLivePrice.ts` - server-side quote polling for live prices
- `proxy.ts` - Next middleware: Supabase session refresh + protected routes
- `supabase/migrations/` - database schema (RLS on every table)
- `docs/` - project docs, including the session handoff (`docs/HANDOFF.md`)
  and feature plans/specs under `docs/superpowers/`

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests, and build on
pushes and pull requests to `main`. A final "Run smoke" step boots the
production server and checks it serves `/login`; it is skipped until the
repo secrets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `FINNHUB_API_KEY`, and
`TWELVEDATA_API_KEY` are configured
(Settings -> Secrets and variables -> Actions).
