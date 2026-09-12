# Local improvements and verification

This report records the local verification of the analysis, reliability, and usability improvements.
No deployment or database mutation was performed during validation.
Pre-existing local tooling changes are excluded from the pull request.

## Bugs fixed

- Options: negative or fractional contracts, invalid prices, and reversed spread strikes now show validation errors instead of misleading results.
- Options: index-based sampling fixes an infinite loop at a $1 strike and includes exact strike, secondary-strike, breakeven, and zero-price points.
- Options: unattainable breakevens are omitted and maximum profit/loss cannot be negative.
- Options: the chart uses a numeric price axis and straight payoff segments instead of smoothing the strike corners.
- DCF: invalid terminal-growth assumptions no longer silently substitute a higher discount rate.
  Invalid scenarios are omitted with an explanation.
- Rebalancing: target weights must total 100%, and valid prices, share counts, and cash are required before trade instructions are displayed.
- Notifications: the feed now reads owner-scoped active rows from `price_alerts`, normalizes numeric prices, deduplicates quote requests, and tolerates individual quote failures.
  Paused alerts and nonfinite values cannot trigger notifications.
- Notifications: new server props refresh the bell and menu instead of remaining stuck at their initial values.
- Authentication: login and email-confirmation redirects share normalization-aware validation that blocks external redirects, including slash/backslash and control-character variants.
- Search: changing a query clears stale ticker results immediately.
- Command palette: the existing dialog primitive supplies focus containment, Escape dismissal, and focus restoration.
  Search is now available on mobile.

## Features and UI improvements

- Options target-price analysis shows exact expiration profit/loss for all six strategies.
- Options payoff CSV export includes the trade assumptions and sampled expiration outcomes.
- Reset restores trade inputs while preserving the selected strategy.
- Options and heatmap have direct navigation links.
- Navigation marks only the most specific route as active, scrolls within short desktop windows, and respects mobile safe areas.
- A skip-to-content link and accessible calculator slider labels improve keyboard navigation.
- Mobile and tablet headers avoid cramped duplicate search controls.

## Validation

- All 273 Node tests pass, including new options, DCF, rebalance, notification-feed, and redirect regressions.
- ESLint, TypeScript checking, and the production build pass.
- `npm audit` reports zero vulnerabilities after compatible updates.
- HTTP smoke checks passed for 19 routes: overview, options, backtest, heatmap, screener, movers, news, calendar, compare, correlation, comparison matrix, insiders, pricing, login, signup, portfolio, watchlist, alerts, and trading.
  Protected routes redirect signed-out visitors to login.
- A locally started production build served options and login successfully, rejected invalid backtest/correlation inputs with HTTP 400, and returned HTTP 404 for the removed fixture route.
- A browser backtest completed with live historical data.
- Browser QA covered options validation, the formerly hanging $1 strike, spread ordering, target-price outcomes, reset, download, DCF invalid rates, mobile search, modal keyboard behavior, and layouts at 375, 768, and 1440 pixels.
- The exported bull-call spread CSV was inspected on disk: 86 records, eight columns, real CRLF separators, and the expected payoff values.
- A temporary local fixture reproduced stale notification props and a 150% allocation producing buy instructions.
  Browser verification confirmed notification updates and suppression/recovery of the rebalance table after the fixes.
  The fixture route was removed.
- The notification data test uses the real Supabase client with an in-memory HTTP fixture and verifies the table, owner filter, active filter, ordering, quote deduplication, and failure behavior.
- `graphify update .` refreshed the code graph.
  Its optional SQL parser is unavailable, so SQL extraction remains incomplete; no SQL was changed.

## Dependency decisions

Compatible updates include Next.js 16.3.5, React 19.3.0, Supabase, Lucide, Stripe, and shadcn, plus vulnerable transitive packages.
ESLint 10 was tried and reverted because the installed React plugin crashes with `contextOrFilename.getFilename is not a function`.
ESLint 9.39.5 is retained.
TypeScript 7 was skipped because the installed TypeScript ESLint parser supports versions below 6.1.
TypeScript 5.9.3 is retained.
Next.js regenerated its own instruction block in the original checkout during development startup.
That local tooling change is excluded from the pull request.

For future Vercel work, upgrading the outdated global CLI with `npm i -g vercel@latest` is recommended.
No global CLI change was made here.

## Limits

Signed-in account mutations, email delivery, payment checkout, and production deployment were not exercised.
The notification and rebalancing checks used local fixtures, not a real user's account.
The browser reported a hydration warning caused by Grammarly injecting attributes into the document body.
No committed screenshot baseline exists, so responsive checks were visual inspections rather than automated visual regression comparisons.
This pass fixes confirmed issues and adds focused analysis features; it does not establish that every possible bug in the repository has been eliminated.
