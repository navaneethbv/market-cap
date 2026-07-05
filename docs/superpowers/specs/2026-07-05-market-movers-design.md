# Market Movers Design

## Goal

Add a public Market Movers page that ranks a curated basket of stocks by current daily percent move.

## Scope

- Add `/movers` with a `basket` query string.
- Provide preset baskets: Mega Cap, AI, Finance, and ETFs.
- Use existing Finnhub quote fetching through `getQuote`.
- Add pure helper functions in `lib/movers.ts` for basket selection, row building, leaders, laggards, and summary math.
- Add Movers to desktop and mobile navigation.
- Add a dashboard shortcut.
- Record pushed commits in `HANDOFF.md`.

## Non-Goals

- No database tables.
- No saved basket preferences.
- No custom basket builder in this slice.
- No charting beyond ranked cards and tables.

## UX

The page is a daily scan surface. It opens with basket tabs as links, then summary cards for quoted count, average move, advancers, and decliners. Below that, it shows gainers and losers side by side, followed by a detailed table with price, percent move, dollar change, open, previous close, and day range.

## Testing

- Helper tests cover default basket selection, invalid basket fallback, row construction, quote failures, top gainers, top losers, and summary counts.
- Full verification remains `npm test && npm run lint && npm run build`.
