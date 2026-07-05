# MarketCap: Advanced Stock Analytics & Simulated Trading Platform

MarketCap is a state-of-the-art investment research, portfolio management, and simulated trading web application. Powered by Next.js, Supabase, Recharts, and Google's Gemini AI, it provides retail investors with institutional-grade risk diagnostics, interactive charts, and AI-driven portfolio diagnostics.

---

## 🚀 Key Features

### 1. Advanced Charting & Indicators
* **Interactive Charting**: Toggle overlays for **Simple Moving Average (SMA)**, **Exponential Moving Average (EMA)**, and **Bollinger Bands**.
* **Technical Sub-Charts**: Sub-panels synchronized with the cursor display **RSI (14)** and **MACD (12, 26, 9)**.
* **Valuation History**: Dual-line charts displaying overall portfolio valuation and cost-basis history.

### 2. Portfolio Risk & AI Allocation Advisor
* **AI Portfolio Advisor**: Queries Gemini AI to provide allocation grade ratings, sector weights, and specific rebalancing checklists.
* **Risk & Volatility Diagnostics**: Calculates weighted portfolio **Beta** and **Herfindahl-Hirschman Index (HHI)** concentration risk.
* **Stress Test Drawdown Simulator**: Models dollar losses for your current holdings under major historical market downturns (2008 Financial Crisis, 2020 Pandemic Squeeze, 2000 Dot-com Bubble).

### 3. Investment Evaluation Tools
* **Valuation DCF Calculator**: Range sliders for EPS growth, WACC discount rate, and terminal growth rate compute intrinsic fair value in real-time.
* **Scenario Analysis**: Recharts bar chart comparing Bear Case, Current Price, Base Case, and Bull Case side-by-side inside the DCF widget.
* **AI Consensus Valuation**: Animated SVG gauge plotting Gemini-computed consensus valuation scores (0-100) and rationale metrics.
* **Volatility Simulator**: Slider simulating custom S&P 500 shifts to project stock returns and prices based on Beta.
* **Correlation Heatmap Matrix**: Analyze daily price correlation indexes and diversification benefits for multiple assets.
* **News Sentiment Analytics**: Sentiment gauges, timeline trend lines, and side-by-side bullish/bearish headlines lists.
* **Dividend Chowder Scatter Matrix**: Recharts scatter plot mapping Yield % vs. 5Y Dividend Growth % quadrants.
* **Dynamic Stock Screener**: Filters 30 catalog equities by Sector, Cap size, and Valuation, and sorts by Yield, P/E, or Daily Change.
* **Comparison Matrix**: Radar chart scoring vector strengths along with comparative metrics tables.

### 4. Portfolios, Alerts & Calendar
* **Simulated Paper Trading Mode**: Virtual cash account ($100k) with full BUY/SELL transaction order logs.
* **Paper Trading Leaderboard**: Compete with top mock accounts and track your performance rankings.
* **Dividends & Income Tracker**: YoC statistics and monthly payout calendars.
* **Multi-Channel Price Alerts**: Email toggles and Discord/Slack webhook dispatchers.
* **Unified Event Calendar**: Calendars for upcoming Earnings releases, Dividend ex-dates, and market holidays.

---

## 🛠️ Technology Stack

* **Frontend**: React 19 (Client Components, Hooks), Next.js 16 (App Router, Server Actions, API routes), Recharts (data visualizations), Tailwind CSS, Lucide Icons.
* **Database & Auth**: Supabase SSR (Auth Session management, PostgreSQL database, RLS security policies).
* **APIs**: Twelve Data (historical price candles), Finnhub (live quotes, stock search, metrics, news, calendars), Gemini AI (insights summaries, chat assistant, portfolio advisor).

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Financial API Keys
TWELVEDATA_API_KEY=your_twelve_data_key
FINNHUB_API_KEY=your_finnhub_key

# Google Gemini AI Key
GEMINI_API_KEY=your_gemini_key
```

*Note: If the `GEMINI_API_KEY` or financial keys are missing or rate-limited, the application automatically falls back to high-fidelity mock data and simulated diagnostics.*

---

## 📦 Setup & Database Migrations

1. Install dependencies:
   ```bash
   npm install
   ```

2. Apply local Supabase migrations:
   ```bash
   npx supabase migration up
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 🧪 Testing & Quality Assurance

MarketCap features comprehensive test coverage across all core mathematical calculators, data normalizers, and database migrations.

* **Run all Unit & Integration Tests**:
  ```bash
  npm test
  ```
* **Verify Test Coverage Metrics**:
  ```bash
  node --conditions=react-server --experimental-strip-types --no-warnings --test --experimental-test-coverage "lib/**/*.test.mjs"
  ```
  *(Current: 97.37% utility line coverage)*
* **Linting Checks**:
  ```bash
  npm run lint
  ```
* **Production Build Compilation**:
  ```bash
  npm run build
  ```

---

## 🔄 Development Workflow

> [!IMPORTANT]
> All subsequent code modifications and contributions must be submitted via **pull requests**. Direct pushes or merges to the `main` branch are strictly prohibited.

