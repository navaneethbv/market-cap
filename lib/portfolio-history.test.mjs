import assert from "node:assert/strict";
import { test } from "node:test";
import { calculatePortfolioHistory } from "./portfolio-history.ts";

test("calculatePortfolioHistory returns empty array for empty holdings", () => {
  const history = calculatePortfolioHistory([], {});
  assert.deepEqual(history, []);
});

test("calculatePortfolioHistory aggregates holding values correctly starting on purchase date", () => {
  const holdings = [
    {
      id: "1",
      symbol: "AAPL",
      shares: 10,
      avg_cost: 150,
      purchased_at: "2026-06-10",
      created_at: "2026-06-10T12:00:00Z",
    },
    {
      id: "2",
      symbol: "MSFT",
      shares: 5,
      avg_cost: 300,
      purchased_at: "2026-06-20",
      created_at: "2026-06-20T12:00:00Z",
    },
  ];

  const candlesMap = {
    AAPL: [
      { time: "2026-06-05", open: 145, high: 146, low: 144, close: 145, volume: 100 },
      { time: "2026-06-12", open: 150, high: 152, low: 149, close: 151, volume: 100 },
      { time: "2026-06-25", open: 155, high: 156, low: 154, close: 155, volume: 100 },
    ],
    MSFT: [
      { time: "2026-06-12", open: 295, high: 298, low: 294, close: 296, volume: 100 },
      { time: "2026-06-25", open: 305, high: 308, low: 304, close: 306, volume: 100 },
    ],
  };

  const history = calculatePortfolioHistory(holdings, candlesMap);

  // Sorted times are: "2026-06-05", "2026-06-12", "2026-06-25"
  assert.equal(history.length, 3);

  // Point 1: 2026-06-05.
  // Purchase date of AAPL is 2026-06-10, MSFT is 2026-06-20.
  // Neither is owned yet.
  assert.equal(history[0].time, "2026-06-05");
  assert.equal(history[0].value, 0);
  assert.equal(history[0].costBasis, 0);

  // Point 2: 2026-06-12.
  // AAPL is owned (purchased 2026-06-10 <= 2026-06-12).
  // MSFT is NOT owned yet (purchased 2026-06-20 > 2026-06-12).
  // AAPL close is 151. Value = 10 * 151 = 1510. CostBasis = 10 * 150 = 1500.
  assert.equal(history[1].time, "2026-06-12");
  assert.equal(history[1].value, 1510);
  assert.equal(history[1].costBasis, 1500);
  assert.equal(history[1].profitLoss, 10);
  assert.equal(history[1].profitLossPercent, (10 / 1500) * 100);

  // Point 3: 2026-06-25.
  // Both are owned.
  // AAPL close is 155. Value contribution = 10 * 155 = 1550. CostBasis contribution = 1500.
  // MSFT close is 306. Value contribution = 5 * 306 = 1530. CostBasis contribution = 5 * 300 = 1500.
  // Total Value = 1550 + 1530 = 3080. Total Cost = 1500 + 1500 = 3000.
  assert.equal(history[2].time, "2026-06-25");
  assert.equal(history[2].value, 3080);
  assert.equal(history[2].costBasis, 3000);
  assert.equal(history[2].profitLoss, 80);
  assert.equal(history[2].profitLossPercent, (80 / 3000) * 100);
});

test("calculatePortfolioHistory falls back to last known price on missing candle dates", () => {
  const holdings = [
    {
      id: "1",
      symbol: "AAPL",
      shares: 10,
      avg_cost: 100,
      purchased_at: "2026-06-01",
      created_at: "2026-06-01T12:00:00Z",
    },
  ];

  const candlesMap = {
    AAPL: [
      { time: "2026-06-01", open: 100, high: 101, low: 99, close: 105, volume: 100 },
      { time: "2026-06-10", open: 110, high: 111, low: 109, close: 115, volume: 100 },
    ],
    MSFT: [
      // Dummy candle to force 2026-06-05 into the union sorted times list
      { time: "2026-06-05", open: 300, high: 301, low: 299, close: 305, volume: 100 },
    ],
  };

  const history = calculatePortfolioHistory(holdings, candlesMap);

  // Sorted times are: "2026-06-01", "2026-06-05", "2026-06-10"
  assert.equal(history.length, 3);

  // At 2026-06-05, AAPL has no candle, so it should fall back to 2026-06-01 close (105)
  assert.equal(history[1].time, "2026-06-05");
  assert.equal(history[1].value, 10 * 105);
  assert.equal(history[1].costBasis, 10 * 100);
});
