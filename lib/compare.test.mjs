import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildComparisonRows,
  calculateComparisonSummary,
  normalizeComparisonSymbols,
} = await import("./compare.ts");

const quote = {
  symbol: "AAPL",
  price: 210,
  change: 4,
  changePercent: 1.94,
  high: 212,
  low: 205,
  open: 206,
  prevClose: 206,
  timestamp: 1760000000,
};

test("normalizeComparisonSymbols defaults, dedupes, and caps symbols", () => {
  assert.deepEqual(normalizeComparisonSymbols(null), ["AAPL", "MSFT", "NVDA"]);
  assert.deepEqual(
    normalizeComparisonSymbols(" aapl, msft AAPL nvda qqq spy dia "),
    ["AAPL", "MSFT", "NVDA", "QQQ", "SPY"]
  );
});

test("normalizeComparisonSymbols drops invalid symbols", () => {
  assert.deepEqual(
    normalizeComparisonSymbols("DROP TABLE, brk.b, too_long_symbol, tsla"),
    ["BRK.B", "TSLA"]
  );
});

test("buildComparisonRows preserves requested order and records failures", () => {
  assert.deepEqual(
    buildComparisonRows(["AAPL", "MSFT"], [
      { status: "fulfilled", value: quote },
      { status: "rejected", reason: new Error("rate limited") },
    ]),
    [
      {
        symbol: "AAPL",
        quote,
        rank: 1,
        error: null,
      },
      {
        symbol: "MSFT",
        quote: null,
        rank: null,
        error: "rate limited",
      },
    ]
  );
});

test("calculateComparisonSummary finds best, worst, and average change", () => {
  const rows = buildComparisonRows(
    ["AAPL", "MSFT", "NVDA"],
    [
      { status: "fulfilled", value: quote },
      {
        status: "fulfilled",
        value: { ...quote, symbol: "MSFT", changePercent: -0.5 },
      },
      {
        status: "fulfilled",
        value: { ...quote, symbol: "NVDA", changePercent: 3.56 },
      },
    ]
  );

  assert.deepEqual(calculateComparisonSummary(rows), {
    pricedCount: 3,
    symbolCount: 3,
    best: { symbol: "NVDA", changePercent: 3.56 },
    worst: { symbol: "MSFT", changePercent: -0.5 },
    averageChangePercent: 1.6666666666666667,
  });
});
