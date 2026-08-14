import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateMonthlyDividendForecast } from "./dividend-forecast.ts";

test("calculateMonthlyDividendForecast calculates annual income, monthly flows, and YOC", () => {
  const holdings = [
    {
      symbol: "JNJ",
      shares: 100,
      avgCost: 120, // cost basis: $12,000
      price: 150,   // market value: $15,000
      dividendYield: 3.0, // annual income: $450 (3% of $15,000)
    },
    {
      symbol: "KO",
      shares: 200,
      avgCost: 50,  // cost basis: $10,000
      price: 60,    // market value: $12,000
      dividendYield: 3.2, // annual income: $384 (3.2% of $12,000)
    },
  ];

  const result = calculateMonthlyDividendForecast(holdings);

  // Total annual income: 450 + 384 = 834
  assert.equal(result.totalAnnualIncome, 834);
  assert.equal(result.monthlyAverage, 69.5); // 834 / 12
  assert.equal(result.portfolioMarketValue, 27000);
  assert.equal(result.portfolioCostBasis, 22000);

  // Yield on Cost: (834 / 22000) * 100 = 3.79%
  assert.equal(result.yieldOnCostPercent, 3.79);
  // Current Yield: (834 / 27000) * 100 = 3.09%
  assert.equal(result.currentYieldPercent, 3.09);

  // Monthly cash flows check: 12 months, sum should equal total annual income
  assert.equal(result.monthlyCashFlows.length, 12);
  const monthlySum = result.monthlyCashFlows.reduce((acc, m) => acc + m.projectedIncome, 0);
  assert.ok(Math.abs(monthlySum - 834) < 0.1);
});

test("calculateMonthlyDividendForecast handles zero dividend payers or empty portfolio", () => {
  const emptyResult = calculateMonthlyDividendForecast([]);
  assert.equal(emptyResult.totalAnnualIncome, 0);
  assert.equal(emptyResult.monthlyAverage, 0);
  assert.equal(emptyResult.currentYieldPercent, 0);
  assert.equal(emptyResult.yieldOnCostPercent, 0);
  assert.equal(emptyResult.monthlyCashFlows.length, 12);

  const nonDividend = [
    {
      symbol: "TSLA",
      shares: 10,
      avgCost: 200,
      price: 220,
      dividendYield: null,
    },
  ];
  const nonDivResult = calculateMonthlyDividendForecast(nonDividend);
  assert.equal(nonDivResult.totalAnnualIncome, 0);
  assert.equal(nonDivResult.holdings[0].annualIncome, 0);
});
