# Graph Report - market-cap  (2026-08-22)

## Corpus Check
- 251 files · ~116,171 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 971 nodes · 2475 edges · 49 communities (31 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 59,995 input · 1,876 output

## Community Hubs (Navigation)
- Trading and Dashboard Pages
- Market Data API Routes
- Auth, Pricing and Billing
- Portfolio Analytics Pages
- Charting and Strategy Backtesting
- Comparison and Correlation APIs
- Screener and Market Heatmap
- Server Actions and CSV Import
- News and Sentiment Analysis
- Paper Trading Engine
- Search and Notification UI
- Price Alerts
- TypeScript Configuration
- Auth Pages and Supabase Client
- App Shell and Theming
- Monte Carlo and Snowball Projections
- Dialogs and Form Buttons
- shadcn Component Registry
- Market Calendar and Earnings
- Portfolio Income and Rebalancing
- Runtime Dependencies
- Compare Matrix and Insiders
- Dev Dependencies and Linting
- Feature Design Docs
- Options Payoff Calculator
- Stock Radar Scoring
- Package Scripts and Metadata
- Volatility Simulator
- Proxy Middleware and Rate Limiting
- Command Palette
- Product Documentation
- ESLint Config
- Next.js Package
- Next.js Config
- Next Themes
- Radix UI
- Recharts
- server-only Package
- shadcn CLI
- Sonner Toasts
- Supabase JS Client
- Tailwind Merge
- Tailwind Animate CSS
- PostCSS Config
- CI Workflow
- Investa Reference Image
- Omega Reference Image
- Implementation Notes

## God Nodes (most connected - your core abstractions)
1. `cn()` - 79 edges
2. `formatPrice()` - 63 edges
3. `createClient()` - 60 edges
4. `Button()` - 42 edges
5. `getQuote()` - 42 edges
6. `isValidSymbol()` - 27 edges
7. `formatNumber()` - 23 edges
8. `Quote` - 22 edges
9. `getKeyMetrics()` - 20 edges
10. `TableCell()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `MarketCap: Session Handoff` --references--> `Investa Light Mode UI`  [EXTRACTED]
  docs/HANDOFF.md → img/reference-1.webp
- `MarketCap: Session Handoff` --references--> `Omega Dark Mode UI`  [EXTRACTED]
  docs/HANDOFF.md → img/original-504b55ef8b9cf1d9c00b73cdcc3f22a8.webp
- `DialogOverlay()` --calls--> `cn()`  [EXTRACTED]
  components/ui/dialog.tsx → lib/utils.ts
- `DropdownMenuCheckboxItem()` --calls--> `cn()`  [EXTRACTED]
  components/ui/dropdown-menu.tsx → lib/utils.ts
- `DropdownMenuRadioItem()` --calls--> `cn()`  [EXTRACTED]
  components/ui/dropdown-menu.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MarketCap Design System** — img_omega_dark, img_investa_light, docs_handoff [EXTRACTED 1.00]

## Communities (49 total, 18 thin omitted)

### Community 0 - "Trading and Dashboard Pages"
Cohesion: 0.05
Nodes (78): ComparePageProps, SavedComparison, basketParam(), MoverCard(), MoversPage(), MoversPageProps, PortfolioAllocationPage(), fetchAllPaperTrades() (+70 more)

### Community 1 - "Market Data API Routes"
Cohesion: 0.05
Nodes (56): GET(), MatrixStock, GET(), GET(), GET(), GET(), getIndexLabel(), getWatchlistRows() (+48 more)

### Community 2 - "Auth, Pricing and Billing"
Cohesion: 0.07
Nodes (46): GET(), POST(), SavedComparisonsPage(), openCustomerPortal(), startProCheckout(), FREE_FEATURES, metadata, PricingPage() (+38 more)

### Community 3 - "Portfolio Analytics Pages"
Cohesion: 0.07
Nodes (39): PortfolioPage(), getBetaTone(), RiskDiagnosticsPage(), metadata, TaxLossHarvestingPage(), formatPrice(), formatTick(), PortfolioHistoryChart() (+31 more)

### Community 4 - "Charting and Strategy Backtesting"
Cohesion: 0.07
Nodes (39): BacktestPage(), ChartType, CustomCandleBarProps, formatTick(), MainChartTooltip(), RANGES, StockChart(), TooltipPayloadItem (+31 more)

### Community 5 - "Comparison and Correlation APIs"
Cohesion: 0.09
Nodes (33): GET(), GET(), GET(), GET(), CorrelationPage(), ComparePage(), symbolsParam(), buildComparisonRows() (+25 more)

### Community 6 - "Screener and Market Heatmap"
Cohesion: 0.10
Nodes (27): GET(), HeatmapPage(), metadata, ScreenerPage(), MarketHeatmap(), ExportPortfolioCsvButton(), handleExport(), ScreenerExportButton() (+19 more)

### Community 7 - "Server Actions and CSV Import"
Cohesion: 0.12
Nodes (28): GET(), createSavedComparison(), deleteSavedComparison(), getComparisonId(), getFormString(), requireUser(), updateSavedComparison(), createHolding() (+20 more)

### Community 8 - "News and Sentiment Analysis"
Cohesion: 0.13
Nodes (23): FILTERS, NewsPage(), NewsPageProps, NewsList(), SENTIMENT_CLASSES, SENTIMENT_LABELS, NewsTabsProps, getSentimentLabel() (+15 more)

### Community 9 - "Paper Trading Engine"
Cohesion: 0.10
Nodes (26): getFormString(), placePaperTrade(), recordPaperEquitySnapshot(), requireUser(), resetPaperAccount(), validateOrderThresholds(), ExportTradesButton(), handleExport() (+18 more)

### Community 10 - "Search and Notification UI"
Cohesion: 0.09
Nodes (18): NotificationCenter(), SearchBox(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem() (+10 more)

### Community 11 - "Price Alerts"
Cohesion: 0.13
Nodes (26): createAlert(), deleteAlert(), getAlertId(), getFormString(), requireUser(), toggleAlertActive(), updateAlert(), AlertsPage() (+18 more)

### Community 12 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 13 - "Auth Pages and Supabase Client"
Cohesion: 0.15
Nodes (21): LoginForm(), handleSubmit(), SignupPage(), handleSubmit(), Card(), CardAction(), CardContent(), CardDescription() (+13 more)

### Community 14 - "App Shell and Theming"
Cohesion: 0.11
Nodes (13): jakarta, metadata, AppSidebar(), MobileNav(), NAV_ITEMS, ThemeProvider(), ThemeToggle(), Topbar() (+5 more)

### Community 15 - "Monte Carlo and Snowball Projections"
Cohesion: 0.14
Nodes (17): MonteCarloPage(), SnowballPage(), PortfolioSummaryData, renderButtonContent(), SyncPortfolioButton(), usePortfolioSync(), createSeededRandom(), MonteCarloInput (+9 more)

### Community 16 - "Dialogs and Form Buttons"
Cohesion: 0.24
Nodes (12): EditHoldingDialog(), PendingSubmitButton(), Button(), buttonVariants, Dialog(), DialogContent(), DialogDescription(), DialogFooter() (+4 more)

### Community 17 - "shadcn Component Registry"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 18 - "Market Calendar and Earnings"
Cohesion: 0.21
Nodes (18): addDays(), isoDate(), MarketCalendarPage(), CalendarDashboardProps, buildEarningsRows(), EarningsRow, fixedDate(), getEasterDate() (+10 more)

### Community 19 - "Portfolio Income and Rebalancing"
Cohesion: 0.16
Nodes (14): metadata, PortfolioIncomePage(), metadata, PortfolioRebalancePage(), RebalanceCalculator(), handleSetEqualWeights(), EnrichedHoldingData, enrichHoldingsMarketData() (+6 more)

### Community 20 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (19): class-variance-authority, clsx, lucide-react, dependencies, class-variance-authority, clsx, lucide-react, react (+11 more)

### Community 21 - "Compare Matrix and Insiders"
Cohesion: 0.15
Nodes (9): ComparedStock, CompareMatrixPage(), TooltipPayloadItem, getBadgeStyle(), getTextStyle(), InsidersPage(), Input(), AlignedReturnPoint (+1 more)

### Community 22 - "Dev Dependencies and Linting"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 23 - "Feature Design Docs"
Cohesion: 0.13
Nodes (13): MarketCap: Session Handoff, Investa Light Mode UI, Omega Dark Mode UI, Four Feature Expansion Implementation Plan, Market Movers Implementation Plan, Paper Trading Implementation Plan, Price Alerts Implementation Plan, Stock Compare Implementation Plan (+5 more)

### Community 24 - "Options Payoff Calculator"
Cohesion: 0.22
Nodes (9): metadata, getBiasBadgeClass(), OptionsCalculator(), STRATEGIES, StrategyOption, calculatePayoffCurve(), OptionsPayoffSummary, OptionStrategyType (+1 more)

### Community 25 - "Stock Radar Scoring"
Cohesion: 0.25
Nodes (11): RADAR_COLORS, StockRadarChart(), buildRadarComparisonData(), calculateGrowthScore(), calculateMomentumScore(), calculateProfitabilityScore(), calculateStabilityScore(), calculateValuationScore() (+3 more)

### Community 26 - "Package Scripts and Metadata"
Cohesion: 0.17
Nodes (11): name, overrides, js-yaml, private, scripts, build, dev, lint (+3 more)

### Community 27 - "Volatility Simulator"
Cohesion: 0.44
Nodes (7): getMarketMoveBadgeClass(), getProjectedMoveTextClass(), PageProps, VolatilitySimulatorPage(), calculateProjectedMove(), calculateProjectedPrice(), getBetaVolatilityLabel()

### Community 28 - "Proxy Middleware and Rate Limiting"
Cohesion: 0.36
Nodes (6): config, EXTERNAL_API_PREFIXES, isRateLimited(), PROTECTED_PATHS, proxy(), requestBuckets

### Community 29 - "Command Palette"
Cohesion: 0.47
Nodes (4): CommandPalette(), closePalette(), handleKeyDown(), openPalette()

## Knowledge Gaps
- **227 isolated node(s):** `STATUS_LABELS`, `MatrixStock`, `ComparedStock`, `TooltipPayloadItem`, `ComparePageProps` (+222 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Auth Pages and Supabase Client` to `Trading and Dashboard Pages`, `Portfolio Analytics Pages`, `Charting and Strategy Backtesting`, `Screener and Market Heatmap`, `News and Sentiment Analysis`, `Search and Notification UI`, `App Shell and Theming`, `Dialogs and Form Buttons`, `Compare Matrix and Insiders`, `Volatility Simulator`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `formatPrice()` connect `Trading and Dashboard Pages` to `Market Data API Routes`, `Auth, Pricing and Billing`, `Portfolio Analytics Pages`, `Charting and Strategy Backtesting`, `Screener and Market Heatmap`, `Server Actions and CSV Import`, `Price Alerts`, `Monte Carlo and Snowball Projections`, `Dialogs and Form Buttons`, `Portfolio Income and Rebalancing`, `Compare Matrix and Insiders`, `Volatility Simulator`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Auth, Pricing and Billing` to `Trading and Dashboard Pages`, `Market Data API Routes`, `Portfolio Analytics Pages`, `Comparison and Correlation APIs`, `Server Actions and CSV Import`, `Paper Trading Engine`, `Search and Notification UI`, `Price Alerts`, `Auth Pages and Supabase Client`, `App Shell and Theming`, `Market Calendar and Earnings`, `Portfolio Income and Rebalancing`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `STATUS_LABELS`, `MatrixStock`, `ComparedStock` to the rest of the system?**
  _227 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Trading and Dashboard Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.050613258810743675 - nodes in this community are weakly interconnected._
- **Should `Market Data API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.051791629027401385 - nodes in this community are weakly interconnected._
- **Should `Auth, Pricing and Billing` be split into smaller, more focused modules?**
  _Cohesion score 0.06946386946386947 - nodes in this community are weakly interconnected._