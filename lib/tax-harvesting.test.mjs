import assert from "node:assert/strict";
import { test } from "node:test";
import { getEtfReplacements, evaluateTaxLossHarvesting } from "./tax-harvesting.ts";

test("getEtfReplacements returns mapped ETF substitutes or fallback", () => {
  assert.deepEqual(getEtfReplacements("AAPL"), ["XLK", "VGT", "FTEC"]);
  assert.deepEqual(getEtfReplacements("SPY"), ["IVV", "VOO", "SCHX"]);
  assert.deepEqual(getEtfReplacements("UNKNOWN_TICKER"), ["VOO", "VTI", "SCHD"]);
});

test("evaluateTaxLossHarvesting filters loss positions and computes tax savings", () => {
  const holdings = [
    {
      id: "h1",
      symbol: "NVDA",
      shares: 10,
      avgCost: 150,
      purchasedAt: null,
      quote: { price: 120, symbol: "NVDA" },
      costBasis: 1500,
      marketValue: 1200,
      profitLoss: -300,
      error: null,
    },
    {
      id: "h2",
      symbol: "AAPL",
      shares: 20,
      avgCost: 170,
      purchasedAt: null,
      quote: { price: 180, symbol: "AAPL" },
      costBasis: 3400,
      marketValue: 3600,
      profitLoss: 200, // gain, should be ignored
      error: null,
    },
    {
      id: "h3",
      symbol: "TSLA",
      shares: 5,
      avgCost: 240,
      purchasedAt: null,
      quote: { price: 200, symbol: "TSLA" },
      costBasis: 1200,
      marketValue: 1000,
      profitLoss: -200,
      error: null,
    },
  ];

  const result = evaluateTaxLossHarvesting(holdings, 20);
  assert.equal(result.candidateCount, 2);
  assert.equal(result.totalUnrealizedLoss, 500); // 300 + 200
  assert.equal(result.estimatedTaxSavings, 100); // 500 * 0.20
  assert.equal(result.candidates[0].symbol, "NVDA"); // largest loss first
  assert.equal(result.candidates[0].unrealizedLoss, 300);
  assert.equal(result.candidates[1].symbol, "TSLA");
});

test("evaluateTaxLossHarvesting handles no-loss portfolio cleanly", () => {
  const allGains = [
    {
      id: "h1",
      symbol: "AAPL",
      shares: 10,
      avgCost: 100,
      purchasedAt: null,
      quote: { price: 150, symbol: "AAPL" },
      costBasis: 1000,
      marketValue: 1500,
      profitLoss: 500,
      error: null,
    },
  ];

  const result = evaluateTaxLossHarvesting(allGains, 15);
  assert.equal(result.candidateCount, 0);
  assert.equal(result.totalUnrealizedLoss, 0);
  assert.equal(result.estimatedTaxSavings, 0);
  assert.deepEqual(result.candidates, []);
});
