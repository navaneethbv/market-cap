import assert from "node:assert/strict";
import { test } from "node:test";
import { filterScreenerStocks, sortScreenerStocks } from "./screener.ts";

const mockStocks = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    marketCap: 3000, // $3T
    peRatio: 28,
    dividendYield: 0.5,
    beta: 1.2,
    price: 180,
    change: 2,
    changePercent: 1.1,
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    sector: "Financials",
    marketCap: 500, // $500B
    peRatio: 12,
    dividendYield: 2.5,
    beta: 1.0,
    price: 160,
    change: -1,
    changePercent: -0.6,
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    sector: "Consumer Cyclical",
    marketCap: 600, // $600B
    peRatio: 65,
    dividendYield: 0.0,
    beta: 1.5,
    price: 220,
    change: 8,
    changePercent: 3.7,
  },
];

test("filterScreenerStocks filters by sector", () => {
  const filtered = filterScreenerStocks(mockStocks, { sector: "Technology" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].symbol, "AAPL");
});

test("filterScreenerStocks filters by market cap categories", () => {
  // Mega: > 100B, Large: 10B - 100B, MidSmall: < 10B
  // In mock stocks, marketCaps are 3000, 500, 600. All are Mega.
  const mega = filterScreenerStocks(mockStocks, { marketCap: "Mega" });
  assert.equal(mega.length, 3);

  const mid = filterScreenerStocks(mockStocks, { marketCap: "MidSmall" });
  assert.equal(mid.length, 0);
});

test("filterScreenerStocks filters by valuation categories", () => {
  // Value: PE < 15, Growth: PE > 30, Income: yield > 2.0%
  const value = filterScreenerStocks(mockStocks, { valuation: "Value" });
  assert.equal(value.length, 1);
  assert.equal(value[0].symbol, "JPM");

  const growth = filterScreenerStocks(mockStocks, { valuation: "Growth" });
  assert.equal(growth.length, 1);
  assert.equal(growth[0].symbol, "TSLA");

  const income = filterScreenerStocks(mockStocks, { valuation: "Income" });
  assert.equal(income.length, 1);
  assert.equal(income[0].symbol, "JPM");
});

test("sortScreenerStocks sorts correctly", () => {
  const capSorted = sortScreenerStocks(mockStocks, "marketCap");
  assert.equal(capSorted[0].symbol, "AAPL"); // 3000
  assert.equal(capSorted[1].symbol, "TSLA"); // 600
  assert.equal(capSorted[2].symbol, "JPM");  // 500

  const changeSorted = sortScreenerStocks(mockStocks, "changePercent");
  assert.equal(changeSorted[0].symbol, "TSLA"); // 3.7%
  assert.equal(changeSorted[1].symbol, "AAPL"); // 1.1%
  assert.equal(changeSorted[2].symbol, "JPM");  // -0.6%

  // Sort with null values
  const stocksWithNulls = [
    { ...mockStocks[0], peRatio: null, dividendYield: null },
    { ...mockStocks[1], peRatio: 15, dividendYield: 2.5 },
    { ...mockStocks[2], peRatio: 30, dividendYield: null },
  ];

  const peSorted = sortScreenerStocks(stocksWithNulls, "peRatio");
  // Expected order: 15 (JPM), 30 (TSLA), null (AAPL)
  assert.equal(peSorted[0].symbol, "JPM");
  assert.equal(peSorted[1].symbol, "TSLA");
  assert.equal(peSorted[2].symbol, "AAPL");

  const yieldSorted = sortScreenerStocks(stocksWithNulls, "dividendYield");
  // Expected order: 2.5 (JPM), null (AAPL), null (TSLA)
  assert.equal(yieldSorted[0].symbol, "JPM");
});
