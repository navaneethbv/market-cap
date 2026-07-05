import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildAlertRows,
  calculateAlertSummary,
  evaluatePriceAlert,
  normalizeAlertInput,
} = await import("./alerts.ts");

const quote = {
  symbol: "AAPL",
  price: 212,
  change: 1.5,
  changePercent: 0.71,
  high: 214,
  low: 209,
  open: 210,
  prevClose: 210.5,
  timestamp: 1760000000,
};

test("normalizeAlertInput uppercases symbols and parses target prices", () => {
  assert.deepEqual(
    normalizeAlertInput({
      symbol: " aapl ",
      direction: "above",
      targetPrice: "225.50",
    }),
    {
      symbol: "AAPL",
      direction: "above",
      targetPrice: 225.5,
      notifyEmail: false,
      webhookUrl: null,
    }
  );
});

test("normalizeAlertInput rejects invalid alert values", () => {
  assert.throws(
    () =>
      normalizeAlertInput({
        symbol: "DROP TABLE",
        direction: "above",
        targetPrice: "100",
      }),
    /Invalid symbol/
  );
  assert.throws(
    () =>
      normalizeAlertInput({
        symbol: "AAPL",
        direction: "sideways",
        targetPrice: "100",
      }),
    /Invalid alert direction/
  );
  assert.throws(
    () =>
      normalizeAlertInput({
        symbol: "AAPL",
        direction: "above",
        targetPrice: "0",
      }),
    /Target price must be greater than zero/
  );
});

test("evaluatePriceAlert handles above and below trigger rules", () => {
  assert.deepEqual(
    evaluatePriceAlert(
      {
        id: "1",
        symbol: "AAPL",
        direction: "above",
        target_price: 200,
        active: true,
        triggered_at: null,
        created_at: "2026-07-05T00:00:00Z",
      },
      quote
    ),
    {
      status: "triggered",
      isTriggered: true,
      distance: 12,
      distancePercent: 6,
    }
  );

  assert.deepEqual(
    evaluatePriceAlert(
      {
        id: "2",
        symbol: "AAPL",
        direction: "below",
        target_price: 200,
        active: true,
        triggered_at: null,
        created_at: "2026-07-05T00:00:00Z",
      },
      quote
    ),
    {
      status: "watching",
      isTriggered: false,
      distance: 12,
      distancePercent: 6,
    }
  );
});

test("buildAlertRows preserves order and marks paused or unavailable alerts", () => {
  const rows = buildAlertRows(
    [
      {
        id: "1",
        symbol: "AAPL",
        direction: "above",
        target_price: 220,
        active: true,
        triggered_at: null,
        created_at: "2026-07-05T00:00:00Z",
      },
      {
        id: "2",
        symbol: "MSFT",
        direction: "below",
        target_price: 400,
        active: false,
        triggered_at: null,
        created_at: "2026-07-05T01:00:00Z",
      },
      {
        id: "3",
        symbol: "NVDA",
        direction: "above",
        target_price: 180,
        active: true,
        triggered_at: null,
        created_at: "2026-07-05T02:00:00Z",
      },
    ],
    [
      { status: "fulfilled", value: quote },
      { status: "fulfilled", value: { ...quote, symbol: "MSFT", price: 410 } },
      { status: "rejected", reason: new Error("rate limited") },
    ]
  );

  assert.equal(rows[0].status, "watching");
  assert.equal(rows[0].distance, 8);
  assert.equal(rows[1].status, "paused");
  assert.equal(rows[1].quote?.price, 410);
  assert.equal(rows[2].status, "unavailable");
  assert.equal(rows[2].error, "rate limited");
});

test("calculateAlertSummary counts alert states", () => {
  const summary = calculateAlertSummary([
    {
      id: "1",
      symbol: "AAPL",
      direction: "above",
      targetPrice: 200,
      active: true,
      triggeredAt: null,
      createdAt: "2026-07-05T00:00:00Z",
      quote,
      status: "triggered",
      isTriggered: true,
      distance: 12,
      distancePercent: 6,
      error: null,
    },
    {
      id: "2",
      symbol: "MSFT",
      direction: "below",
      targetPrice: 400,
      active: true,
      triggeredAt: null,
      createdAt: "2026-07-05T01:00:00Z",
      quote: null,
      status: "unavailable",
      isTriggered: false,
      distance: null,
      distancePercent: null,
      error: "rate limited",
    },
    {
      id: "3",
      symbol: "NVDA",
      direction: "above",
      targetPrice: 180,
      active: false,
      triggeredAt: null,
      createdAt: "2026-07-05T02:00:00Z",
      quote: null,
      status: "paused",
      isTriggered: false,
      distance: null,
      distancePercent: null,
      error: null,
    },
  ]);

  assert.deepEqual(summary, {
    totalCount: 3,
    activeCount: 2,
    triggeredCount: 1,
    pausedCount: 1,
    unavailableCount: 1,
  });
});
