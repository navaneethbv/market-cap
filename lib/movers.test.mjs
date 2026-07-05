import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildMoverRows,
  calculateMoversSummary,
  getMoverBasket,
  getTopMovers,
} = await import("./movers.ts");

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

test("getMoverBasket returns the default basket for missing or invalid input", () => {
  assert.equal(getMoverBasket(null).id, "mega-cap");
  assert.equal(getMoverBasket("unknown").id, "mega-cap");
});

test("getMoverBasket resolves known baskets", () => {
  assert.deepEqual(getMoverBasket("ai"), {
    id: "ai",
    label: "AI",
    description: "Chip and platform names driving the AI trade.",
    symbols: ["NVDA", "AMD", "AVGO", "MSFT", "GOOGL", "META"],
  });
});

test("buildMoverRows preserves basket order and records quote failures", () => {
  assert.deepEqual(
    buildMoverRows(["AAPL", "MSFT"], [
      { status: "fulfilled", value: quote },
      { status: "rejected", reason: new Error("rate limited") },
    ]),
    [
      {
        symbol: "AAPL",
        quote,
        error: null,
        direction: "up",
      },
      {
        symbol: "MSFT",
        quote: null,
        error: "rate limited",
        direction: "unavailable",
      },
    ]
  );
});

test("getTopMovers returns ranked gainers and losers", () => {
  const rows = buildMoverRows(
    ["AAPL", "MSFT", "NVDA", "META"],
    [
      { status: "fulfilled", value: { ...quote, symbol: "AAPL", changePercent: 1.2 } },
      { status: "fulfilled", value: { ...quote, symbol: "MSFT", changePercent: -0.5 } },
      { status: "fulfilled", value: { ...quote, symbol: "NVDA", changePercent: 4.4 } },
      { status: "fulfilled", value: { ...quote, symbol: "META", changePercent: -2.1 } },
    ]
  );

  assert.deepEqual(getTopMovers(rows, 2), {
    gainers: [rows[2], rows[0]],
    losers: [rows[3], rows[1]],
  });
});

test("calculateMoversSummary counts advancers, decliners, and average move", () => {
  const rows = buildMoverRows(
    ["AAPL", "MSFT", "NVDA", "META"],
    [
      { status: "fulfilled", value: { ...quote, symbol: "AAPL", changePercent: 1 } },
      { status: "fulfilled", value: { ...quote, symbol: "MSFT", changePercent: -2 } },
      { status: "fulfilled", value: { ...quote, symbol: "NVDA", changePercent: 0 } },
      { status: "rejected", reason: new Error("rate limited") },
    ]
  );

  assert.deepEqual(calculateMoversSummary(rows), {
    symbolCount: 4,
    quotedCount: 3,
    advancingCount: 1,
    decliningCount: 1,
    flatCount: 1,
    averageChangePercent: -0.3333333333333333,
  });
});
