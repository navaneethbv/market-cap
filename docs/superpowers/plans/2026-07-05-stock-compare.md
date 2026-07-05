# Stock Compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public stock comparison page for two to five symbols.

**Architecture:** Use pure helper functions for parsing and summary math, then render a server page using existing quote fetchers. No new database tables or client state are needed.

**Tech Stack:** Next.js 16 App Router, React Server Components, Finnhub quote helper, shadcn/ui table and button components, Node test runner.

## Global Constraints

- Keep the feature public and database-free.
- Use the existing quote helper and format helpers.
- Follow TDD for helper behavior before UI.
- Never use the em dash character in code comments or documentation.

---

### Task 1: Helper Tests

**Files:**
- Create: `lib/compare.test.mjs`

**Interfaces:**
- Expected helpers: `normalizeComparisonSymbols`, `buildComparisonRows`, `calculateComparisonSummary`.

- [ ] Write failing tests for parsing, deduping, max count, defaults, quote failures, and summary math.
- [ ] Run `npm test` and verify the tests fail because `lib/compare.ts` is missing.

### Task 2: Helper Implementation

**Files:**
- Create: `lib/compare.ts`

**Interfaces:**
- `normalizeComparisonSymbols(input)` returns two to five valid uppercase symbols.
- `buildComparisonRows(symbols, quoteResults)` returns rows preserving requested order.
- `calculateComparisonSummary(rows)` returns best, worst, average change, and priced count.

- [ ] Implement the minimal helpers.
- [ ] Run `npm test` and verify all tests pass.

### Task 3: Compare UI

**Files:**
- Create: `app/compare/page.tsx`
- Modify: `components/app-sidebar.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- `/compare?symbols=AAPL,MSFT,NVDA` renders comparison data.
- Home page links to `/compare`.
- Navigation includes Compare.

- [ ] Add the server page with async `searchParams`.
- [ ] Add Compare to desktop and mobile nav.
- [ ] Add a dashboard call-to-action.
- [ ] Run `npm test && npm run lint && npm run build`.

### Task 4: Handoff And Push

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Append ledger entries for `0d6f162` and the stock compare commits.

- [ ] Update handoff with the feature and pushed commit ledger.
- [ ] Commit the docs and feature.
- [ ] Push `main` to `origin`.
