import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildHoldingRows,
  calculatePortfolioSummary,
  normalizeHoldingInput,
} = await import("./portfolio.ts");

test("normalizeHoldingInput uppercases symbols and parses numeric fields", () => {
  assert.deepEqual(
    normalizeHoldingInput({
      symbol: " aapl ",
      shares: " 2.5 ",
      avgCost: "190.25",
      purchasedAt: "2026-07-01",
    }),
    {
      symbol: "AAPL",
      shares: 2.5,
      avgCost: 190.25,
      purchasedAt: "2026-07-01",
    }
  );
});

test("normalizeHoldingInput rejects invalid holding values", () => {
  assert.throws(
    () =>
      normalizeHoldingInput({
        symbol: "DROP TABLE",
        shares: "1",
        avgCost: "10",
        purchasedAt: "2026-07-01",
      }),
    /Invalid symbol/
  );
  assert.throws(
    () =>
      normalizeHoldingInput({
        symbol: "AAPL",
        shares: "0",
        avgCost: "10",
        purchasedAt: "2026-07-01",
      }),
    /Shares must be greater than zero/
  );
  assert.throws(
    () =>
      normalizeHoldingInput({
        symbol: "AAPL",
        shares: "1",
        avgCost: "10",
        purchasedAt: "invalid-date",
      }),
    /Purchase date is required/
  );
});

test("buildHoldingRows calculates value, cost basis, and profit loss", () => {
  const rows = buildHoldingRows(
    [
      {
        id: "1",
        symbol: "AAPL",
        shares: 2,
        avg_cost: 100,
        purchased_at: "2026-07-01",
        created_at: "2026-07-01T00:00:00Z",
      },
      {
        id: "2",
        symbol: "MSFT",
        shares: 1.5,
        avg_cost: 400,
        purchased_at: "2026-07-02",
        created_at: "2026-07-02T00:00:00Z",
      },
    ],
    [
      {
        status: "fulfilled",
        value: {
          symbol: "AAPL",
          price: 125,
          change: 1,
          changePercent: 0.8,
          high: 130,
          low: 120,
          open: 122,
          prevClose: 124,
          timestamp: 1760000000,
        },
      },
      { status: "rejected", reason: new Error("quote unavailable") },
    ]
  );

  assert.equal(rows[0].marketValue, 250);
  assert.equal(rows[0].costBasis, 200);
  assert.equal(rows[0].profitLoss, 50);
  assert.equal(rows[0].profitLossPercent, 25);
  assert.equal(rows[1].marketValue, null);
  assert.equal(rows[1].error, "quote unavailable");
});

test("calculatePortfolioSummary totals available holding rows", () => {
  const summary = calculatePortfolioSummary([
    {
      id: "1",
      symbol: "AAPL",
      shares: 2,
      avgCost: 100,
      purchasedAt: "2026-07-01",
      quote: null,
      marketValue: 250,
      costBasis: 200,
      profitLoss: 50,
      profitLossPercent: 25,
      error: null,
    },
    {
      id: "2",
      symbol: "MSFT",
      shares: 1,
      avgCost: 300,
      purchasedAt: "2026-07-02",
      quote: null,
      marketValue: null,
      costBasis: 300,
      profitLoss: null,
      profitLossPercent: null,
      error: "quote unavailable",
    },
  ]);

  assert.deepEqual(summary, {
    marketValue: 250,
    costBasis: 500,
    profitLoss: 50,
    profitLossPercent: 10,
    pricedHoldingCount: 1,
    holdingCount: 2,
  });
});

test("buildHoldingRows handles zero cost basis and non-Error quote rejection reasons", () => {
  const rows = buildHoldingRows(
    [
      {
        id: "1",
        symbol: "FREE",
        shares: 5,
        avg_cost: 0,
        purchased_at: "2026-07-01",
        created_at: "2026-07-01T00:00:00Z",
      },
      {
        id: "2",
        symbol: "FAIL",
        shares: 1,
        avg_cost: 100,
        purchased_at: "2026-07-01",
        created_at: "2026-07-01T00:00:00Z",
      },
    ],
    [
      {
        status: "fulfilled",
        value: {
          symbol: "FREE",
          price: 10,
          change: 0,
          changePercent: 0,
          high: 10,
          low: 10,
          open: 10,
          prevClose: 10,
          timestamp: 1760000000,
        },
      },
      { status: "rejected", reason: "Plain string failure reason" },
    ]
  );

  assert.equal(rows[0].costBasis, 0);
  assert.equal(rows[0].profitLossPercent, null);
  assert.equal(rows[1].error, "Quote unavailable");
});

test("calculatePortfolioSummary handles zero cost basis portfolio", () => {
  const summary = calculatePortfolioSummary([
    {
      id: "1",
      symbol: "FREE",
      shares: 5,
      avgCost: 0,
      purchasedAt: "2026-07-01",
      quote: null,
      marketValue: 0,
      costBasis: 0,
      profitLoss: 0,
      profitLossPercent: null,
      error: null,
    },
  ]);

  assert.equal(summary.costBasis, 0);
  assert.equal(summary.profitLossPercent, 0);
});

test("enrichHoldingsMarketData enriches raw holdings with prices and dividend metrics", async () => {
  const { enrichHoldingsMarketData } = await import("./portfolio.ts");
  const rawHoldings = [
    { symbol: "AAPL", shares: "10", avg_cost: "150" },
    { symbol: "MSFT", shares: 5, avg_cost: 300 },
  ];
  const quoteResults = [
    { status: "fulfilled", value: { price: 180 } },
    { status: "rejected", reason: new Error("fail") },
  ];
  const metricsResults = [
    { status: "fulfilled", value: { dividendYield: 0.5 } },
    { status: "fulfilled", value: { dividendYield: 0.8 } },
  ];

  const enriched = enrichHoldingsMarketData(rawHoldings, quoteResults, metricsResults, ["AAPL", "MSFT"]);
  assert.equal(enriched.length, 2);
  assert.equal(enriched[0].price, 180);
  assert.equal(enriched[0].dividendYield, 0.5);
  assert.equal(enriched[1].price, 300); // fallback to avgCost
  assert.equal(enriched[1].dividendYield, 0.8);
});

