# Market Movers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public Market Movers page ranking curated stock baskets by current daily percent move.

**Architecture:** Use pure helper functions for basket lookup and quote ranking, then render a server page using existing quote fetchers. No Supabase changes are needed.

**Tech Stack:** Next.js 16 App Router, React Server Components, Finnhub quote helper, shadcn/ui table and button components, Node test runner.

## Global Constraints

- Keep the feature public and database-free.
- Use existing `getQuote`, `ChangeChip`, and format helpers.
- Use TDD for helper behavior before UI.
- Never use the em dash character in code comments or documentation.

---

### Task 1: Helper Tests

**Files:**
- Create: `lib/movers.test.mjs`

**Interfaces:**
- Expected helpers: `getMoverBasket`, `buildMoverRows`, `getTopMovers`, `calculateMoversSummary`.

- [ ] Write failing tests for default basket, invalid basket fallback, quote rows, quote failures, gainers, losers, and summary counts.
- [ ] Run `npm test` and verify the tests fail because `lib/movers.ts` is missing.

### Task 2: Helper Implementation

**Files:**
- Create: `lib/movers.ts`

**Interfaces:**
- `getMoverBasket(input)` returns a known basket object.
- `buildMoverRows(symbols, quoteResults)` returns rows preserving requested order.
- `getTopMovers(rows, limit)` returns `{ gainers, losers }`.
- `calculateMoversSummary(rows)` returns quoted count, symbol count, average change, advancers, decliners, and flat count.

- [ ] Implement the minimal helpers.
- [ ] Run `npm test` and verify all tests pass.

### Task 3: Movers UI

**Files:**
- Create: `app/movers/page.tsx`
- Modify: `components/app-sidebar.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- `/movers?basket=ai` renders the AI basket.
- Home page links to `/movers`.
- Navigation includes Movers.

- [ ] Add the server page with async `searchParams`.
- [ ] Add Movers to desktop and mobile nav.
- [ ] Add a dashboard call-to-action.
- [ ] Run `npm test && npm run lint && npm run build`.

### Task 4: Handoff And Push

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Append ledger entries for `badaf5f` and the Market Movers commits.

- [ ] Update handoff with the feature and pushed commit ledger.
- [ ] Commit the docs and feature.
- [ ] Push `main` to `origin`.
