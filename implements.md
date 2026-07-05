# MarketCap: Future Features & Implementation Plans

This document outlines new features that can be built for the MarketCap application. Each plan details the product value, user experience, database migrations, API changes, and frontend implementation.

---

## 1. Portfolio Historical Performance Chart

### Value Proposition
Currently, the portfolio page only shows the current holdings and total all-time gains or losses. An interactive historical performance chart (similar to Google Finance or Robinhood) allows users to track their portfolio's value over time (1D, 1W, 1M, 6M, 1Y, 5Y) to visualize historical returns and performance trends.

### UX Design
- **Location**: Top of `/portfolio` page, above the holdings table.
- **Components**:
  - A summary header displaying the current portfolio value, dollar change, and percentage change for the selected time range.
  - A range selector button group (1D, 1W, 1M, 6M, 1Y, 5Y).
  - An interactive line/area chart built with Recharts, featuring a tooltip showing the historical valuation on hover.
  - Dynamic line colors: green if the performance over the period is positive, red if negative.

### Technical Implementation
1. **Historical Data Gathering**:
   - For a given range (e.g., 1Y), fetch daily historical candle data for all stocks currently in the user's portfolio using the Twelve Data API (`/api/candles` endpoint).
   - Filter historical price data by the purchase date of each holding (do not include stock value before the purchase date).
2. **Aggregation Logic**:
   - Align candle data by date.
   - For each historical date, calculate:
     $$\text{Valuation}_t = \sum (\text{Quantity}_i \times \text{ClosePrice}_{i, t}) + \text{RemainingCash}$$
   - Return a time-series list of `{ date, value }` points.
3. **Database Considerations**:
   - For a basic implementation, calculate this dynamically in Next.js Server Actions or API routes.
   - For an advanced implementation, create a `portfolio_snapshots` table populated daily by a cron job to store historical balances and avoid excessive API fetches.

---

## 2. Technical Indicator Overlays on Stock Charts

### Value Proposition
Provide active traders with technical analysis tools by adding toggleable technical indicator overlays (Simple Moving Average (SMA), Exponential Moving Average (EMA), Relative Strength Index (RSI), MACD, and Bollinger Bands) to the stock details page.

### UX Design
- **Location**: On `/stock/[symbol]`, above or inside the Recharts container.
- **Controls**:
  - A dropdown menu allowing users to select and toggle indicators:
    - **Overlays**: SMA (50), SMA (200), EMA (20), Bollinger Bands.
    - **Sub-charts**: RSI (14), MACD (12, 26, 9), Volume.
  - Secondary charts (like RSI or MACD) appear directly underneath the main price chart as smaller, synchronized charts.

### Technical Implementation
1. **Mathematical Helpers**:
   - Create a new utility file `lib/market/indicators.ts`.
   - Implement pure functions to compute:
     - **SMA**: Simple average of closing prices over a moving window.
     - **EMA**: Exponentially weighted moving average giving more weight to recent prices.
     - **RSI**: Momentum oscillator measuring the speed and change of price movements.
     - **Bollinger Bands**: SMA line plus and minus standard deviations of the price.
2. **Recharts Rendering**:
   - Map indicator lines as extra `<Line />` components on the main chart, matching the date indices.
   - Render separate chart panels for RSI/MACD with aligned tooltips.

---

## 3. Gemini-Powered AI Stock Analyst & News Summarizer

### Value Proposition
Synthesize stock metrics, balance sheets, and raw news headlines into a clean, actionable "Bull vs. Bear Case" and investment summary using Google's Gemini API. This saves investors time by digesting complex sentiment and financial data.

### UX Design
- **Location**: A dedicated "AI Insights" tab or section on `/stock/[symbol]`.
- **Components**:
  - A summary card with a consensus gauge (Bullish, Bearish, or Neutral).
  - Two parallel columns: "The Bull Case" (upside drivers) and "The Bear Case" (downside risks).
  - An interactive chat assistant box: "Ask Gemini about this stock..." for contextual questions about the company.

### Technical Implementation
1. **API Integration**:
   - Add `@google/generative-ai` to dependencies.
   - Create a secure Next.js API route `/api/stock/[symbol]/analysis` or a Server Action.
2. **Prompt Engineering**:
   - Retrieve stock profile (Finnhub), key metrics (P/E ratio, debt-to-equity), and the latest 10 news articles.
   - Pass this structured data to the Gemini model (e.g., Gemini 1.5 Flash) with instructions to format output as clean JSON containing summary fields.
3. **Caching**:
   - Cache results in a Redis instance or Supabase table `stock_ai_summaries` for 24 hours to prevent exceeding API rate limits and control costs.

---

## 4. Simulated Paper Trading & Cash Balance Management

### Value Proposition
Allow users to practice investing without financial risk. Users start with a virtual cash balance (e.g., $100,000) and can place simulated buy and sell market orders, tracking transaction history, average cost basis, and paper portfolio value separately.

### UX Design
- **Location**: Toggle in the AppSidebar ("Paper Trading Mode").
- **Stock Page Update**: When Paper Trading mode is active, show "Buy Stock" and "Sell Stock" forms instead of adding holdings manually.
- **Portfolio Page Update**: Show virtual holdings and trade history separately from real portfolios.

### Technical Implementation
1. **Database Schema**:
   - Create a `paper_portfolios` table:
     - `id` (UUID, primary key)
     - `user_id` (UUID, references auth.users)
     - `cash_balance` (numeric, default 100000.00)
     - `created_at` (timestamptz)
   - Create a `paper_transactions` table:
     - `id` (UUID, primary key)
     - `user_id` (UUID, references auth.users)
     - `symbol` (text)
     - `transaction_type` (text: BUY or SELL)
     - `quantity` (numeric)
     - `price` (numeric)
     - `executed_at` (timestamptz)
2. **Backend Actions**:
   - Implement Supabase transactions (or functions) to execute order matching:
     - **BUY**: Check if `cash_balance >= (quantity * price)`. Deduct cash, insert transaction, update/insert virtual holdings.
     - **SELL**: Check if user has sufficient quantity of the symbol. Add cash, insert transaction, update/delete virtual holdings.

---

## 5. Multi-Channel Price Alerts (Webhooks, Email, Discord)

### Value Proposition
Enhance the existing database-only Price Alerts feature. Deliver real-time notifications to users outside the app via email, Slack, or Discord webhooks when their price targets are hit.

### UX Design
- **Location**: Settings section inside the `/alerts` page.
- **Controls**:
  - Input field for Discord/Slack webhook URLs.
  - Checkbox to toggle email alerts.
  - Alert test buttons to send mock notifications.

### Technical Implementation
1. **Database Updates**:
   - Add alert channels to the `price_alerts` table:
     - `notify_email` (boolean)
     - `webhook_url` (text)
2. **Notification Service**:
   - Create a Next.js API route `/api/alerts/check` or a cron job.
   - Regularly fetch active alerts. Compare current real-time prices (via Finnhub WebSocket or HTTP queries) with alert targets.
   - If an alert is triggered:
     - Mark alert as triggered (`status = 'triggered'`).
     - If `notify_email` is true, send an email via Resend or SMTP.
     - If `webhook_url` is provided, send a POST payload formatting the alert details nicely for Discord/Slack markdown.

---

## 6. Dividends & Income Tracker Dashboard

### Value Proposition
Provide long-term dividend growth investors with an income dashboard mapping out estimated future cash flows, dividend calendars, and key dividend statistics.

### UX Design
- **Location**: A new tab under `/portfolio` called "Income" or a separate route `/portfolio/income`.
- **Components**:
  - **Key Metrics**: Annual Dividend Income, Average Portfolio Yield, Yield on Cost (YoC).
  - **Income Chart**: A monthly bar chart showing estimated cash flows from payouts over the next 12 months.
  - **Dividend Calendar**: A list of upcoming Ex-Dividend and Payment dates for stocks owned.

### Technical Implementation
1. **Data Source**:
   - Retrieve dividend payout data from Finnhub or Twelve Data.
   - If limits restrict dividend data, mock standard dividend rates for major holdings or add a field to the `holdings` table where users can optionally input the annual dividend payout per share.
2. **Aggregation**:
   - Calculate annual income:
     $$\text{Annual Income} = \sum (\text{Shares Owned}_i \times \text{Dividend Per Share}_i)$$
   - Map ex-dividend dates to the next 12 calendar months to build the Recharts bar chart showing expected monthly distributions.
