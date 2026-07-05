import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateIncomeSummary, getDividendGrowth, calculateChowderScore } from "./income.ts";

test("calculateIncomeSummary aggregates dividend metrics correctly", () => {
  const metrics = [
    {
      symbol: "AAPL",
      shares: 10,
      price: 180,
      avgCost: 150,
      dividendYield: 0.5, // 0.5%
    },
    {
      symbol: "MSFT",
      shares: 5,
      price: 300,
      avgCost: 280,
      dividendYield: 1.0, // 1%
    },
  ];

  const summary = calculateIncomeSummary(metrics);

  // AAPL: Value = 1800. Annual Income = 1800 * 0.005 = 9. CostBasis = 1500.
  // MSFT: Value = 1500. Annual Income = 1500 * 0.01 = 15. CostBasis = 1400.
  // Total Income = 9 + 15 = 24.
  // Total Value = 3300. Weighted Yield = 24 / 3300 = 0.727272%
  // Total CostBasis = 2900. Yield on Cost = 24 / 2900 = 0.827586%
  assert.equal(summary.annualIncome, 24);
  assert.equal(summary.totalCostBasis, 2900);
  assert.equal(summary.totalMarketValue, 3300);
  assert.equal(summary.portfolioYield.toFixed(4), "0.7273");
  assert.equal(summary.yieldOnCost.toFixed(4), "0.8276");
});

test("calculateIncomeSummary handles zero yields and empty lists", () => {
  const summary = calculateIncomeSummary([]);
  assert.equal(summary.annualIncome, 0);
  assert.equal(summary.portfolioYield, 0);
  assert.equal(summary.yieldOnCost, 0);
});

test("getDividendGrowth returns matching or default values", () => {
  assert.equal(getDividendGrowth("KO"), 4.8);
  assert.equal(getDividendGrowth("MSFT"), 10.5);
  assert.equal(getDividendGrowth("UNKNOWN"), 4.5);
  assert.equal(getDividendGrowth("  aapl  "), 8.2); // Checks trimming and case normalization
});

test("calculateChowderScore sums yield and growth with rounding", () => {
  assert.equal(calculateChowderScore(2.5, 8.2), 10.7);
  assert.equal(calculateChowderScore(1.155, 4.333), 5.49);
});
