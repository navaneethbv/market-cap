# MarketCap Feature & Architecture Documentation

This document covers all features, analytical modules, data workflows, and test suites implemented across MarketCap.

---

## 1. Universal Command Palette (`⌘K` / `Ctrl+K`)

- **Overview**: A terminal-style spotlight search overlay that allows power users to navigate the application, look up equities, and trigger interface actions instantly without touching the mouse.
- **Key Capabilities**:
  - **Live Symbol Search**: Debounced querying against `/api/search` with company description previews and direct route navigation to `/stock/[symbol]`.
  - **Instant Navigation**: Deep links to all 15+ sub-tools and application views (Dashboard, Watchlist, Portfolio, Allocation, Rebalancer, Snowball, Risk Diagnostics, Backtester, Screener, Movers, Compare, News, Calendar, Insiders, Paper Trading).
  - **Quick Action Commands**: Theme toggle (Light/Dark mode) with keyboard shortcuts.
  - **Keyboard Navigation**: Full `↑` / `↓` arrow selection, `Enter` to select, and `Esc` to dismiss.
- **Code Locations**:
  - Component: [components/command-palette.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/command-palette.tsx)
  - Integration: [components/topbar.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/topbar.tsx)

---

## 2. Advanced Stock Charting & Technical Indicators

- **Overview**: Dynamic stock chart visualization powered by Recharts, offering multiple chart styles, sub-panels, and configurable technical overlays.
- **Key Capabilities**:
  - **Chart Visual Modes**:
    - **Area**: Gradient filled line chart.
    - **Candles**: Custom SVG candlestick rendering featuring OHLC data, individual high/low wicks, and delta-colored bodies.
    - **Line**: Clean closing price curve.
  - **Volume Sub-Chart**: Aligned volume bar panel colored green (up day) or red (down day).
  - **Configurable Indicators Popover**:
    - **SMA 1 & SMA 2**: Customizable moving average window lengths.
    - **EMA**: Configurable exponential moving average period.
    - **RSI**: Configurable Relative Strength Index period.
    - **Bollinger Bands & MACD**: Standard deviation upper/lower bands and MACD/signal histogram overlays.
- **Code Locations**:
  - Component: [components/stock-chart.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/stock-chart.tsx)
  - Pure Calculations: [lib/market/indicators.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/market/indicators.ts)
  - Unit Tests: [lib/market/indicators.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/market/indicators.test.mjs)

---

## 3. Paper Trading Limit & Stop-Loss Orders + CSV Ledger Export

- **Overview**: Virtual simulated equity trading environment with $100,000 in starting cash, offering realistic order execution and complete ledger export.
- **Key Capabilities**:
  - **Order Types**:
    - **Market Order**: Immediate fill at current quote price.
    - **Limit Order**: Buy when price $\le$ limit price, Sell when price $\ge$ limit price.
    - **Stop-Loss Order**: Trigger buy/sell when stop threshold is breached.
  - **Validation Logic**: `shouldFillOrder` checks boundaries against live quote execution constraints.
  - **Trade Ledger Export**: One-click RFC4180 CSV export of entire transaction history (`Symbol, Type, Order Type, Shares, Price, Total Value, Executed At`).
- **Code Locations**:
  - Logic & Export: [lib/paper-trading.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/paper-trading.ts)
  - Components: [components/paper-trade-ticket.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/paper-trade-ticket.tsx), [components/export-trades-button.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/export-trades-button.tsx)
  - Pages & Actions: [app/trading/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/trading/page.tsx), [app/trading/actions.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/trading/actions.ts), [app/trading/history/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/trading/history/page.tsx)
  - Unit Tests: [lib/paper-trading.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/paper-trading.test.mjs)

---

## 4. Portfolio CSV Import/Export & Target Allocation Rebalancer

- **Overview**: Portfolio management suite enabling bulk data migration and automated rebalancing towards target asset allocations.
- **Key Capabilities**:
  - **CSV Export & Import**:
    - Generates and parses CSV files with format `Symbol, Shares, Avg Cost, Purchased At`.
    - Live import modal with preview table and error validation.
  - **Target Allocation Rebalancer (`/portfolio/rebalance`)**:
    - Interactive target weight adjustments with sum-to-100% validator.
    - "Equal Weight" one-click preset distributing weights evenly across holdings.
    - Cash contribution input adding new funds to the portfolio balance.
    - Computes exact buy/sell trade quantities, target values, and percentage drift.
- **Code Locations**:
  - Logic & Math: [lib/portfolio-csv.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/portfolio-csv.ts), [lib/rebalancer.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/rebalancer.ts)
  - UI Components: [components/portfolio-csv-dialogs.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/portfolio-csv-dialogs.tsx), [components/rebalance-calculator.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/rebalance-calculator.tsx), [components/portfolio-tabs.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/portfolio-tabs.tsx)
  - Page Route: [app/portfolio/rebalance/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/portfolio/rebalance/page.tsx)
  - Unit Tests: [lib/portfolio-csv.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/portfolio-csv.test.mjs), [lib/rebalancer.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/rebalancer.test.mjs)

---

## 5. Stripe Customer Billing Portal & Pro Gating

- **Overview**: Self-serve subscription management connecting authenticated Pro subscribers directly to Stripe Billing Portal.
- **Key Capabilities**:
  - `createCustomerPortalSession`: Initializes a Stripe billing portal session linked to the user's `stripe_customer_id`.
  - Pro UI on `/pricing` switches to a "Manage Subscription & Invoices" action that redirects directly to Stripe.
- **Code Locations**:
  - Helper: [lib/stripe.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/stripe.ts)
  - Action & Page: [app/pricing/actions.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/pricing/actions.ts), [app/pricing/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/pricing/page.tsx)
  - Unit Tests: [lib/stripe.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/stripe.test.mjs)

---

## 6. Quarterly Earnings Surprises & Estimates History

- **Overview**: Tracks consensus EPS expectations versus actual reported results over the previous 4 quarters on the stock detail page.
- **Key Capabilities**:
  - Computes historical beat rates, miss counts, and average surprise percentage.
  - Classifies earnings outcomes: Beat ($\text{actual} > \text{estimate}$), Miss ($\text{actual} < \text{estimate}$), or In-Line ($\text{actual} = \text{estimate}$).
  - Clean visual card with EPS actuals, estimates, and surprise tags.
- **Code Locations**:
  - Logic: [lib/earnings.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/earnings.ts)
  - API Service: `getEarningsSurprises` in [lib/market/finnhub.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/market/finnhub.ts)
  - UI Component: [components/earnings-history.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/earnings-history.tsx)
  - Page: [app/stock/[symbol]/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/stock/[symbol]/page.tsx)
  - Unit Tests: [lib/earnings.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/earnings.test.mjs), [lib/market/finnhub.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/market/finnhub.test.mjs)

---

## 7. Multi-Factor Stock Comparison Radar Chart

- **Overview**: Normalizes fundamental and technical stock metrics into 5 dimensional scores (0–100) and displays them on an interactive radar chart.
- **Dimensional Scoring Model**:
  1. **Valuation**: Inversely proportional to P/E ratio ($P/E < 12 \rightarrow 95$, $P/E > 50 \rightarrow 20$).
  2. **Profitability**: Evaluated on positive EPS and dividend yield bonus.
  3. **Stability**: Evaluated on market Beta ($\beta \le 0.6 \rightarrow 95$, $\beta > 1.6 \rightarrow 35$).
  4. **Momentum**: Relative position within 52-week High/Low trading range.
  5. **Growth**: Earnings yield derived from EPS relative to price.
- **Code Locations**:
  - Logic: [lib/stock-radar.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/stock-radar.ts)
  - UI Component: [components/stock-radar-chart.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/stock-radar-chart.tsx)
  - Page: [app/compare/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/compare/page.tsx)
  - Unit Tests: [lib/stock-radar.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/stock-radar.test.mjs)

---

## 8. Advanced Screener Multi-Factor Filters & CSV Export

- **Overview**: Multi-criteria equity filtering with instant client-side sorting and CSV ledger export.
- **Key Capabilities**:
  - **Filters**: Sector, Market Cap, Valuation/Dividends, and Beta Volatility (Low $<0.8$, Market $0.8–1.2$, High $>1.2$).
  - **Sort Options**: Market Cap, P/E Ratio, Dividend Yield, and 1-Day Price Change.
  - **CSV Export**: Instant download of current filtered stock list.
- **Code Locations**:
  - Filter & CSV Logic: [lib/screener.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/screener.ts)
  - UI Component: [components/screener-export-button.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/screener-export-button.tsx)
  - Page: [app/screener/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/screener/page.tsx)
  - Unit Tests: [lib/screener.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/screener.test.mjs)

---

## 9. In-App Notification Center & Alert Trigger Tracker

- **Overview**: Live price target evaluation that monitors user alerts in real-time and alerts users when thresholds are breached.
- **Key Capabilities**:
  - Evaluates above/below alert directions against current quote values.
  - Computes exact percentage delta from target price.
  - Notification badge counter with popover drawer mounted in the top navigation bar.
- **Code Locations**:
  - Evaluation Logic: [lib/notifications.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/notifications.ts)
  - UI Component: [components/notification-center.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/notification-center.tsx)
  - Integration: [components/topbar.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/topbar.tsx)
  - Unit Tests: [lib/notifications.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/notifications.test.mjs)

---

## 10. Market Sector Heatmap & Treemap (`/heatmap`)

- **Overview**: Interactive equity treemap grouping market leaders by industry sector, sized by market capitalization and colored by 1-day percentage change.
- **Key Capabilities**:
  - Sector filtering buttons and market capitalization aggregation.
  - Smooth color mapping from deep red (-3% or worse) to vibrant emerald green (+3% or better).
- **Code Locations**:
  - Logic: [lib/heatmap.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/heatmap.ts)
  - UI Component: [components/market-heatmap.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/market-heatmap.tsx)
  - Page: [app/heatmap/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/heatmap/page.tsx)
  - Unit Tests: [lib/heatmap.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/heatmap.test.mjs)

---

## 11. Options Strategy Payoff Visualizer (`/options`)

- **Overview**: Visual risk/reward simulator across standard options trading strategies at expiration.
- **Supported Strategies**: Long Call, Long Put, Covered Call, Cash-Secured Put, Bull Call Spread, Bear Put Spread.
- **Key Capabilities**:
  - Interactive parameter inputs (Spot Price, Strike Price, Secondary Strike, Premium, Contracts count).
  - Calculates Max Profit, Max Loss, Breakeven Prices, and P&L across a price spectrum.
- **Code Locations**:
  - Logic: [lib/options-payoff.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/options-payoff.ts)
  - UI Component: [components/options-calculator.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/options-calculator.tsx)
  - Page: [app/options/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/options/page.tsx)
  - Unit Tests: [lib/options-payoff.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/options-payoff.test.mjs)

---

## 12. Portfolio Tax-Loss Harvesting Assistant (`/portfolio/tax-loss`)

- **Overview**: Scans user holdings for unrealized loss positions to offset taxable capital gains while avoiding wash sale penalties.
- **Key Capabilities**:
  - Computes total harvestable capital losses and estimated tax savings across customizable tax brackets (15%, 20%, 24%, 37%).
  - Recommends non-substantially identical substitute sector ETFs (e.g. NVDA $\rightarrow$ `SMH`, `SOXX`).
  - Educational IRS 30-day Wash Sale rule guidance.
- **Code Locations**:
  - Logic: [lib/tax-harvesting.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/tax-harvesting.ts)
  - UI Component: [components/tax-loss-assistant.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/tax-loss-assistant.tsx)
  - Page: [app/portfolio/tax-loss/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/portfolio/tax-loss/page.tsx)
  - Unit Tests: [lib/tax-harvesting.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/tax-harvesting.test.mjs)

---

## 13. Monthly Dividend Cash Flow Calendar (`/portfolio/income`)

- **Overview**: Projects 12-month expected passive cash flow schedule from dividend-paying holdings.
- **Key Capabilities**:
  - 12-month bar chart visualizer distributing quarterly payout cycles.
  - Portfolio Yield on Cost (YOC) vs Current Market Yield metrics.
  - Asset income breakdown table.
- **Code Locations**:
  - Logic: [lib/dividend-forecast.ts](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/dividend-forecast.ts)
  - UI Component: [components/dividend-calendar.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/components/dividend-calendar.tsx)
  - Page: [app/portfolio/income/page.tsx](file:///Users/navaneethbv/Desktop/Projects/market-cap/app/portfolio/income/page.tsx)
  - Unit Tests: [lib/dividend-forecast.test.mjs](file:///Users/navaneethbv/Desktop/Projects/market-cap/lib/dividend-forecast.test.mjs)

---

## 14. Quality & Test Coverage Standards

All pure modules adhere to **>95% code coverage** requirements:

```bash
npm test
```
- **256 / 256 unit tests passed (100%)**
- **>99% Line Coverage**
- **>98% Function Coverage**

