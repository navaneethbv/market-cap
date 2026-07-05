# Four Feature Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add portfolio allocation, saved comparisons, news sentiment filters, and a market calendar.

**Architecture:** Use server-rendered App Router pages backed by pure helper modules and focused tests. Add one Supabase-backed feature, saved comparisons, with RLS and ownership checks that match existing watchlist, holdings, and alerts patterns.

**Tech Stack:** Next.js 16 App Router, TypeScript, Node test runner, Supabase Postgres with RLS, shadcn/ui, lucide-react.

## Global Constraints

- Follow TDD: write each helper or migration test first, watch it fail, then implement.
- Read relevant Next.js docs before page or server-action edits.
- Keep pages as server components unless a client component is required.
- Use existing UI components and formatting helpers.
- Add only one database table: `saved_comparisons`.
- For Supabase, enable RLS, use `(select auth.uid()) = user_id`, index `user_id`, revoke `anon`, and grant only required permissions to `authenticated`.
- Do not add paid providers or AI calls.
- Do not use the forbidden em dash character in code comments or docs added by this plan.

---

## File Structure

- Create `lib/allocation.ts` and `lib/allocation.test.mjs` for portfolio allocation math.
- Create `app/portfolio/allocation/page.tsx` for the authenticated allocation route.
- Modify `app/portfolio/page.tsx` to link to allocation.
- Create `lib/saved-comparisons.ts` and `lib/saved-comparisons.test.mjs` for input normalization.
- Create `app/compare/saved/actions.ts` for authenticated saved comparison mutations.
- Create `app/compare/saved/page.tsx` for the saved comparisons list.
- Modify `app/compare/page.tsx` to render a signed-in save form.
- Create a Supabase migration for `saved_comparisons`.
- Extend `lib/migrations.test.mjs` with `saved_comparisons` expectations.
- Create `lib/news-sentiment.ts` and `lib/news-sentiment.test.mjs`.
- Modify `app/news/page.tsx` and `components/news-list.tsx` for filtering and badges.
- Create `lib/calendar.ts` and `lib/calendar.test.mjs`.
- Extend `lib/market/finnhub.ts` with an earnings calendar helper if the API shape is available.
- Create `app/calendar/page.tsx`.
- Modify `components/app-sidebar.tsx` and `app/page.tsx` for navigation shortcuts.
- Update `HANDOFF.md` after implementation commits.

## Task 1: Portfolio Allocation

**Files:**
- Create: `lib/allocation.test.mjs`
- Create: `lib/allocation.ts`
- Create: `app/portfolio/allocation/page.tsx`
- Modify: `app/portfolio/page.tsx`
- Modify: `components/app-sidebar.tsx`

**Interfaces:**
- Consumes: `HoldingRow` shape from `lib/portfolio.ts`, `formatPrice`, `formatNumber`, `ChangeChip`.
- Produces: `buildAllocationRows(rows)`, `calculateAllocationSummary(rows)`, `getConcentrationLabel(weight)`.

- [ ] **Step 1: Write failing tests**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAllocationRows,
  calculateAllocationSummary,
  getConcentrationLabel,
} from "./allocation.ts";

test("buildAllocationRows sorts positions by portfolio weight", () => {
  const rows = buildAllocationRows([
    { symbol: "MSFT", marketValue: 1500 },
    { symbol: "AAPL", marketValue: 500 },
    { symbol: "CASH", marketValue: null },
  ]);

  assert.deepEqual(
    rows.map((row) => [row.symbol, row.weightPercent]),
    [
      ["MSFT", 75],
      ["AAPL", 25],
      ["CASH", null],
    ]
  );
});

test("calculateAllocationSummary reports concentration", () => {
  const summary = calculateAllocationSummary([
    { symbol: "MSFT", marketValue: 1500 },
    { symbol: "AAPL", marketValue: 500 },
  ]);

  assert.equal(summary.totalMarketValue, 2000);
  assert.equal(summary.positionCount, 2);
  assert.equal(summary.largest?.symbol, "MSFT");
  assert.equal(summary.largestWeightPercent, 75);
});

test("getConcentrationLabel describes largest position risk", () => {
  assert.equal(getConcentrationLabel(42), "High concentration");
  assert.equal(getConcentrationLabel(24), "Moderate concentration");
  assert.equal(getConcentrationLabel(12), "Balanced");
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/allocation.test.mjs`

Expected: fail because `lib/allocation.ts` does not exist.

- [ ] **Step 3: Implement helpers and page**

Implement helpers with a simple `AllocationSourceRow` input that accepts `symbol` and `marketValue`. Add the page by copying the portfolio auth and holdings read pattern, building holding rows, then rendering summary cards and a table.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- lib/allocation.test.mjs && npm test`

Expected: allocation tests and full test suite pass.

- [ ] **Step 5: Commit**

```bash
git add lib/allocation.ts lib/allocation.test.mjs app/portfolio/allocation/page.tsx app/portfolio/page.tsx components/app-sidebar.tsx
git commit -m "Add portfolio allocation view"
```

## Task 2: Saved Comparisons

**Files:**
- Create: `lib/saved-comparisons.test.mjs`
- Create: `lib/saved-comparisons.ts`
- Modify: `lib/migrations.test.mjs`
- Create: `supabase/migrations/*_create_saved_comparisons.sql`
- Create: `app/compare/saved/actions.ts`
- Create: `app/compare/saved/page.tsx`
- Modify: `app/compare/page.tsx`
- Modify: `components/app-sidebar.tsx`

**Interfaces:**
- Consumes: `normalizeComparisonSymbols` from `lib/compare.ts`, Supabase SSR client.
- Produces: `normalizeSavedComparisonInput(input)`, `createSavedComparison(formData)`, `deleteSavedComparison(formData)`, `updateSavedComparison(formData)`.

- [ ] **Step 1: Write failing tests**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSavedComparisonInput } from "./saved-comparisons.ts";

test("normalizeSavedComparisonInput trims names and normalizes symbols", () => {
  assert.deepEqual(
    normalizeSavedComparisonInput({ name: "  AI leaders  ", symbols: "nvda, msft, nvda" }),
    { name: "AI leaders", symbols: ["NVDA", "MSFT"] }
  );
});

test("normalizeSavedComparisonInput rejects invalid saved comparisons", () => {
  assert.throws(
    () => normalizeSavedComparisonInput({ name: "", symbols: "AAPL,MSFT" }),
    /Name is required/
  );
  assert.throws(
    () => normalizeSavedComparisonInput({ name: "One", symbols: "AAPL" }),
    /Choose 2 to 5 symbols/
  );
});
```

Add a migration test that asserts `public.saved_comparisons`, `user_id`, `symbols text[]`, RLS policies, `saved_comparisons_user_id_idx`, `revoke all ... from anon`, and `grant select, insert, update, delete ... to authenticated`.

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/saved-comparisons.test.mjs lib/migrations.test.mjs`

Expected: fail because helper and migration are missing.

- [ ] **Step 3: Implement helper, migration, actions, and pages**

Create the migration using the next sequential migration number. The table must include checks for array length and non-empty name. Server actions must authenticate, validate UUID ids, filter by `user_id`, and call `revalidatePath("/compare/saved")`.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- lib/saved-comparisons.test.mjs lib/migrations.test.mjs && npm test`

Expected: saved-comparison tests and full test suite pass.

- [ ] **Step 5: Commit**

```bash
git add lib/saved-comparisons.ts lib/saved-comparisons.test.mjs lib/migrations.test.mjs supabase/migrations app/compare/saved app/compare/page.tsx components/app-sidebar.tsx
git commit -m "Add saved comparisons"
```

## Task 3: News Sentiment Filter

**Files:**
- Create: `lib/news-sentiment.test.mjs`
- Create: `lib/news-sentiment.ts`
- Modify: `app/news/page.tsx`
- Modify: `components/news-list.tsx`

**Interfaces:**
- Consumes: `NewsArticle` from `lib/market/types.ts`.
- Produces: `classifyNewsSentiment(article)`, `filterNewsBySentiment(articles, sentiment)`, `getSentimentCounts(articles)`.

- [ ] **Step 1: Write failing tests**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyNewsSentiment,
  filterNewsBySentiment,
  getSentimentCounts,
} from "./news-sentiment.ts";

const article = (headline, summary = "") => ({ headline, summary });

test("classifyNewsSentiment labels bullish and bearish stories", () => {
  assert.equal(classifyNewsSentiment(article("Stocks rally after earnings beat")), "bullish");
  assert.equal(classifyNewsSentiment(article("Shares fall after weak guidance")), "bearish");
});

test("classifyNewsSentiment handles neutral and mixed stories", () => {
  assert.equal(classifyNewsSentiment(article("Markets mixed as investors wait")), "neutral");
  assert.equal(classifyNewsSentiment(article("Stock rally fades after weak forecast")), "neutral");
});

test("filterNewsBySentiment and getSentimentCounts summarize articles", () => {
  const articles = [
    article("Stocks rally"),
    article("Shares fall"),
    article("Markets mixed"),
  ];

  assert.equal(filterNewsBySentiment(articles, "bullish").length, 1);
  assert.deepEqual(getSentimentCounts(articles), {
    all: 3,
    bullish: 1,
    bearish: 1,
    neutral: 1,
    unavailable: 0,
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/news-sentiment.test.mjs`

Expected: fail because `lib/news-sentiment.ts` does not exist.

- [ ] **Step 3: Implement helper and UI**

Use small keyword arrays for bullish and bearish terms. The page reads async `searchParams`, filters articles, and renders sentiment link buttons plus badges.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- lib/news-sentiment.test.mjs && npm test`

Expected: news sentiment tests and full test suite pass.

- [ ] **Step 5: Commit**

```bash
git add lib/news-sentiment.ts lib/news-sentiment.test.mjs app/news/page.tsx components/news-list.tsx
git commit -m "Add news sentiment filters"
```

## Task 4: Market Calendar

**Files:**
- Create: `lib/calendar.test.mjs`
- Create: `lib/calendar.ts`
- Modify: `lib/market/finnhub.ts`
- Create: `app/calendar/page.tsx`
- Modify: `components/app-sidebar.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `getMarketHolidays(year)`, `getNextMarketEvents(today, holidays)`, `buildEarningsRows(events)`.

- [ ] **Step 1: Write failing tests**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEarningsRows,
  getMarketHolidays,
  getNextMarketEvents,
} from "./calendar.ts";

test("getMarketHolidays returns major US market closures", () => {
  const holidays = getMarketHolidays(2026);
  assert.ok(holidays.some((holiday) => holiday.name === "New Year's Day"));
  assert.ok(holidays.some((holiday) => holiday.name === "Independence Day"));
  assert.ok(holidays.every((holiday) => holiday.date.startsWith("2026-")));
});

test("getNextMarketEvents filters past holidays", () => {
  const events = getNextMarketEvents("2026-07-05", getMarketHolidays(2026));
  assert.ok(events.every((event) => event.date >= "2026-07-05"));
});

test("buildEarningsRows normalizes provider events", () => {
  assert.deepEqual(
    buildEarningsRows([{ symbol: "aapl", date: "2026-07-28", hour: "amc", epsEstimate: 1.23 }]),
    [{ symbol: "AAPL", date: "2026-07-28", session: "After close", epsEstimate: 1.23 }]
  );
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/calendar.test.mjs`

Expected: fail because `lib/calendar.ts` does not exist.

- [ ] **Step 3: Implement helper and UI**

Use local holiday calculations for New Year's Day, Martin Luther King Jr. Day, Presidents Day, Good Friday, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving, and Christmas. Add a Finnhub earnings calendar fetch that returns an empty list on unavailable data.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- lib/calendar.test.mjs && npm test`

Expected: calendar tests and full test suite pass.

- [ ] **Step 5: Commit**

```bash
git add lib/calendar.ts lib/calendar.test.mjs lib/market/finnhub.ts app/calendar/page.tsx components/app-sidebar.tsx app/page.tsx
git commit -m "Add market calendar"
```

## Task 5: Handoff, Verification, and Push

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: commit hashes created by Tasks 1 through 4.
- Produces: updated project handoff with pushed commit ledger entries.

- [ ] **Step 1: Update handoff**

Record the four features, tests, smoke checks, and commit hashes. Note that the final handoff commit cannot record its own hash.

- [ ] **Step 2: Run full verification**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, lint exits 0, build exits 0.

- [ ] **Step 3: Commit handoff**

```bash
git add HANDOFF.md
git commit -m "Update handoff after four feature expansion"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```
