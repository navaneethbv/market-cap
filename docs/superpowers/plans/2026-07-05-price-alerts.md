# Price Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build protected price alerts for signed-in users.

**Architecture:** Store alert rules in Supabase with RLS. Evaluate rules against current quotes in server-rendered pages using pure helper functions. Mutations use Server Actions with per-action auth checks.

**Tech Stack:** Next.js 16 App Router, React Server Components, Server Actions, Supabase Postgres with RLS, shadcn/ui, Node test runner.

## Global Constraints

- Follow existing app patterns from `/watchlist` and `/portfolio`.
- Keep implementation small: no notification delivery or background jobs.
- Use TDD for helper and migration behavior before production code.
- Never expose service role keys in client code.
- Never use the em dash character in code comments or documentation.

---

### Task 1: Alert Helper And Migration Tests

**Files:**
- Create: `lib/alerts.test.mjs`
- Modify: `lib/migrations.test.mjs`

**Interfaces:**
- Produces expected helper API: `normalizeAlertInput`, `evaluatePriceAlert`, `buildAlertRows`, `calculateAlertSummary`.
- Produces expected migration contract for `public.price_alerts`.

- [ ] **Step 1: Write failing tests**

Create tests for input normalization, invalid symbols and prices, above and below triggers, paused alerts, quote failures, summary counts, and the price alerts migration.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test`

Expected: fails because `lib/alerts.ts` and the migration do not exist yet.

### Task 2: Alert Helper Implementation And Migration

**Files:**
- Create: `lib/alerts.ts`
- Create: `supabase/migrations/202607050006_create_price_alerts.sql`

**Interfaces:**
- `normalizeAlertInput(input)` returns `{ symbol, direction, targetPrice }`.
- `buildAlertRows(alerts, quoteResults)` returns display rows with status and distance values.
- `calculateAlertSummary(rows)` returns active, triggered, paused, and total counts.

- [ ] **Step 1: Implement the minimal helper code and migration**

Add symbol validation, numeric validation, trigger evaluation, row building, summary math, and RLS SQL.

- [ ] **Step 2: Run tests to verify GREEN**

Run: `npm test`

Expected: all tests pass.

### Task 3: Alerts UI And Actions

**Files:**
- Create: `app/alerts/actions.ts`
- Create: `app/alerts/page.tsx`
- Create: `components/alert-dialogs.tsx`
- Modify: `components/app-sidebar.tsx`
- Modify: `proxy.ts`

**Interfaces:**
- `createAlert(formData)` inserts an alert for the signed-in user.
- `updateAlert(formData)` updates an owned alert.
- `deleteAlert(formData)` deletes an owned alert.
- `toggleAlertActive(formData)` flips `active` for an owned alert.

- [ ] **Step 1: Implement Server Actions**

Use `createClient`, `supabase.auth.getUser()`, `normalizeAlertInput`, `revalidatePath("/alerts")`, and `redirect("/login?next=/alerts")` when unauthenticated.

- [ ] **Step 2: Implement UI**

Render the alerts table and dialogs using existing card, table, input, label, button, badge, and dialog components.

- [ ] **Step 3: Protect route and add navigation**

Add `/alerts` to protected paths and navigation items.

### Task 4: Remote Migration, Verification, Documentation, Commit

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Remote Supabase migration name: `create_price_alerts`.

- [ ] **Step 1: Apply migration**

Use Supabase MCP `_apply_migration` with SQL from `202607050006_create_price_alerts.sql`.

- [ ] **Step 2: Smoke test**

Use the existing test account to insert, select, update, and delete an alert. Verify cross-user insert rejection if a second test user is available.

- [ ] **Step 3: Verify locally**

Run: `npm test && npm run lint && npm run build`

Expected: all pass.

- [ ] **Step 4: Update docs and commit**

Update `HANDOFF.md`, then commit the feature.
