# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

Read `docs/HANDOFF.md` first when resuming work: it holds the session
handoff, the pushed commit ledger (append to it after every push), test
account details, and open NEXT UP items.

House rule: NEVER use the em dash character anywhere in output, code,
comments, or docs for this project. Use a hyphen or rewrite the sentence.

## Commands

```bash
npm run dev      # dev server (use -- --port 3100 to match the handoff notes)
npm run build    # production build
npm run lint     # eslint
npm test         # node --experimental-strip-types --test "lib/**/*.test.mjs"
```

Run a single test file:

```bash
node --experimental-strip-types --no-warnings --test lib/format.test.mjs
```

CI (`.github/workflows/ci.yml`) runs lint, test, and build on Node 24 for
pushes and PRs to `main`, plus a "Run smoke" step (boot `npm run start`,
curl `/login`) that only runs when the data/Supabase repo secrets are
configured. All must pass before considering work done.

## Architecture

MarketCap is a Google Finance style app: Next.js 16 App Router (TS),
Tailwind v4 + shadcn/ui, Supabase (auth + Postgres + RLS), Recharts.
US stocks only, free API tiers.

**Data flow:**

```
Finnhub (server)  ──lib/market/finnhub.ts──►  server components / API routes
Twelve Data       ──lib/market/twelvedata.ts──►  /api/candles ──► StockChart
Finnhub websocket ──hooks/useLivePrice.ts──►  LivePriceDisplay (client)
Supabase          ──lib/supabase/{server,client}.ts──►  pages + server actions
```

- `lib/market/*` is `server-only` (API keys stay server side). The client
  reaches market data through `/api/quote`, `/api/search`, `/api/candles`.
  Exception: the Finnhub websocket uses `NEXT_PUBLIC_FINNHUB_API_KEY`
  directly (accepted trade-off, documented in the handoff).
- Quote fan-outs use `Promise.allSettled`; `build*Rows(items, quoteResults)`
  helpers in `lib/` pair items with settled results by index and carry
  per-row `error` strings instead of failing the page.
- `proxy.ts` is the Next 16 middleware: refreshes the Supabase session and
  redirects signed-out users off `PROTECTED_PATHS` (`/portfolio`,
  `/watchlist`, `/alerts`, `/compare/saved`, `/trading`). Any new
  authenticated route must be added there; pages also self-redirect as
  defense in depth.
- Server actions (`app/*/actions.ts`) follow one pattern: `requireUser()`,
  validate ids (UUID regex or `isUuid`), normalize input in a pure `lib/`
  helper that throws on bad input, mutate scoped by `.eq("user_id", user.id)`,
  then `revalidatePath`. Forms mirror validation with `required`/`maxLength`
  attributes so bad input rarely reaches the throwing server action.
- `hooks/useLivePrice.ts`: websocket with a 15 s polling fallback. Its effect
  deliberately depends only on `symbol`; do NOT add `initialQuote` to the
  deps or every server re-render (any `revalidatePath`) reconnects the
  socket. `LivePriceDisplay` is keyed by symbol at the call site.
- Symbol validation is the shared regex `^[A-Z0-9.^-]{1,12}$` (app code and
  SQL checks); comparison helpers also strip SQL-ish RESERVED_WORDS.
- Open-redirect guard everywhere a `next` path is honored: only accept
  values starting with `/` and not `//` (watchlist toggle, auth confirm,
  and `createHolding`, whose optional `next` lets the stock page's
  Add to portfolio dialog land on `/portfolio` after saving).

## Database (Supabase)

Tables: `watchlist_items`, `holdings`, `price_alerts`, `saved_comparisons`,
`paper_accounts`, `paper_trades`, `paper_equity_snapshots`.
Every migration follows the same hardening recipe: check constraints,
`revoke all` from `anon` and `authenticated`, explicit grants, RLS enabled,
and per-operation policies on `(select auth.uid()) = user_id`.
`lib/migrations.test.mjs` asserts this recipe over the SQL files; extend it
when adding a migration. Remote migrations are applied through the Supabase
MCP or CLI; record applied ones in `docs/HANDOFF.md`. Paper trading derives
cash and positions from the `paper_trades` ledger via `lib/paper-trading.ts`
(fetch trades with `fetchAllPaperTrades` from `app/trading/data.ts`, which
paginates past the PostgREST 1000-row cap); never store derived position
state.

## Testing notes

- Tests are `lib/**/*.test.mjs`, run by the node test runner importing raw
  `.ts` files via `--experimental-strip-types`. Runtime imports between lib
  files therefore need an explicit `.ts` extension (see
  `lib/stock-display.ts` importing `./format.ts`), enabled by
  `allowImportingTsExtensions` in tsconfig. Type-only imports are exempt.
- Keep `lib/` helpers pure (no Next/React imports) so they stay node-testable.
  Pages and components are verified by `npm run build` plus manual smoke.
- Formatters live in `lib/format.ts` (`formatPrice`, `formatPriceOrDash`,
  `formatCompact`, `formatNumber`, `timeAgo`). Do not create private copies
  in components; import them.

## Conventions

- User wants incremental commits at every working milestone; append pushed
  commits to the ledger in `docs/HANDOFF.md`.
- Feature work gets a design doc and plan under `docs/superpowers/`
  (see existing examples) before implementation.
- When asked for a "new-changes" drop, mirror every touched file under
  `/Users/nbangalorevenugo/Desktop/market-cap/new-changes/market-cap/<path>`
  and keep its top-level `README.md` file map current.
- Playwright MCP screenshots land in the repo root or `.playwright-mcp/`;
  delete them before committing.
- shadcn CLI usage: `npx shadcn@latest add <component> -y -s`.

@AGENTS.md
