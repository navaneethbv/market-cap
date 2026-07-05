# MarketCap Next Feature Picks

Recommended next features from the 10-item list, chosen for usefulness, fit with
the current app, implementation risk, and ability to stay honest with real data.

## Best Features To Implement Next

### 1. Backtesting Engine and Strategy Simulator

This is the strongest next feature. MarketCap already has chart candles,
technical indicators, paper trading concepts, and Recharts. A backtester turns
those pieces into a useful investing workflow without needing broker access or
new user-sensitive integrations.

MVP:
- Route: `/backtest`
- Inputs: symbol, date range, starting cash, strategy type
- Strategies: SMA crossover and RSI threshold
- Output: equity curve, buy-and-hold comparison, total return, max drawdown,
  win rate, trade count
- Data: Twelve Data candles, with honest empty/error states when data is
  unavailable

Why now:
- High user value
- Fits the existing stack cleanly
- Can be tested with pure helper functions first
- Builds on existing indicators and paper trading logic

### 2. Advanced Correlation Heatmap Matrix

This is a good follow-up because it strengthens the portfolio and comparison
areas. The previous removed version was not acceptable because it used weak
hourly data and fallback/random values. A proper version should use aligned
daily returns only and show unavailable cells when data is missing.

MVP:
- Route: `/compare/correlation` or a tab under `/compare/matrix`
- Inputs: 2 to 10 symbols from a query string, saved comparison, watchlist, or
  portfolio
- Output: Pearson correlation heatmap based on daily returns
- Data quality rule: no random fallback data, no fabricated values, minimum
  overlapping observations before showing a coefficient

Why now:
- Useful for risk and diversification
- Reuses compare, watchlist, portfolio, and candle helpers
- Lower risk than broker sync, options, or AI transcript ingestion

### 3. Dividend Snowball and DRIP Compounding Planner

This pairs well with the existing dividend-income area in the portfolio. It is
motivating, understandable, and does not require complex external integrations.

MVP:
- Route: `/portfolio/dividends` or an expanded dividend panel
- Inputs: monthly contribution, reinvest dividends toggle, annual dividend
  growth assumption, time horizon
- Output: projected portfolio value, annual dividend income, yield on cost,
  income crossover target
- Data: current manual holdings plus user assumptions, clearly labeled as a
  projection

Why now:
- Good product polish for long-term investors
- Mostly pure math and UI
- Easy to test thoroughly

### 4. Portfolio Monte Carlo Simulator

This should come after the correlation heatmap because it needs volatility and
correlation inputs to be credible. It can evolve the current `/portfolio/risk`
page from diagnostics into planning.

MVP:
- Route: `/portfolio/risk/simulations` or a section on `/portfolio/risk`
- Inputs: horizon, monthly contribution, expected return assumption, simulation
  count
- Output: 10th, 50th, and 90th percentile fan chart plus probability of ending
  above a user-defined target
- Data quality rule: label assumptions clearly and avoid presenting projections
  as predictions

Why later:
- Powerful, but needs careful assumptions
- Better after daily-return and correlation infrastructure exists

### 5. Dynamic Insider Trading Tracker

This is a solid public-market data feature if built from SEC Form 4 filings. It
adds a new signal type without touching user brokerage accounts.

MVP:
- Route: `/insiders`
- Inputs: symbol search and watchlist filter
- Output: recent insider buys and sells, officer title, transaction size,
  transaction date, direct/indirect ownership flag
- Data: SEC filings or a trustworthy provider, cached server-side

Why later:
- Valuable, but introduces a new data source and parser
- Best after the analytics roadmap above is stronger

## Not Recommended Yet

### Multi-Broker Sync

Very valuable, but too much security, OAuth, data-normalization, support, and
compliance surface for the next slice. Build it only after the app has a mature
portfolio model and clear paid-tier value.

### Options Strategy Builder

Useful for advanced traders, but it needs options chain data, expiration
handling, assignment assumptions, and careful payoff modeling. It would pull the
product toward a different audience.

### Tax-Loss Harvesting Advisor

Potentially valuable, but the current portfolio model stores aggregate holdings,
not tax lots. This should wait until holdings support lots, sale history, and
realized gains.

### AI Earnings Transcript Summarizer

Interesting, but it needs a new AI provider key, transcript source, caching,
rate limits, and careful hallucination controls. It is better after the data
foundation is stronger.

### Institutional 13F Analyzer

Good idea, but quarterly 13F data is delayed and more of a research module than
a core portfolio workflow. It can come after insider tracking or as a broader
SEC filings feature.

## Suggested Build Order

1. Backtesting Engine and Strategy Simulator
2. Advanced Correlation Heatmap Matrix
3. Dividend Snowball and DRIP Compounding Planner
4. Portfolio Monte Carlo Simulator
5. Dynamic Insider Trading Tracker

This order keeps the roadmap close to the current product: stock research,
portfolio analytics, risk, and paper-trading style experimentation.
