# Stock Compare Design

## Goal

Add a public comparison page where users can compare two to five symbols using the latest quotes already available through Finnhub.

## Scope

- Add `/compare` with a simple GET form backed by the `symbols` query string.
- Normalize, dedupe, and cap input symbols in `lib/compare.ts`.
- Fetch quotes server-side with existing `getQuote`.
- Show best performer, weakest performer, average move, and a scan-friendly table.
- Add Compare to desktop and mobile navigation.
- Record the new pushed commits in `HANDOFF.md`.

## Non-Goals

- No saved comparisons.
- No new Supabase tables.
- No charts or metrics beyond quote data.

## UX

The page is a working analysis surface. It keeps the existing MarketCap card/table language, with a small comparison form at the top, performance summary cards, and a table optimized for scanning current price, daily change, open, previous close, and day range.

## Testing

- Helper tests cover symbol parsing, defaults, deduping, maximum count, invalid values, quote failures, and summary math.
- Full verification remains `npm test && npm run lint && npm run build`.
