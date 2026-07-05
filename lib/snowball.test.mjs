import assert from "node:assert/strict";
import { test } from "node:test";
import { runSnowballProjection } from "./snowball.ts";

test("runSnowballProjection handles zero starting inputs", () => {
  const result = runSnowballProjection({
    initialPortfolioValue: 0,
    initialAnnualDividends: 0,
    monthlyContribution: 0,
    reinvestDividends: false,
    dividendGrowthRate: 0.05,
    expectedPriceAppreciation: 0.06,
    timeHorizonYears: 5,
  });

  assert.equal(result.points.length, 6); // Year 0 to 5
  assert.equal(result.points[5].portfolioValue, 0);
  assert.equal(result.points[5].annualDividends, 0);
  assert.equal(result.crossoverYear, null);
  assert.equal(result.finalYieldOnCost, 0);
  assert.equal(result.totalDividendsReceived, 0);
});

test("runSnowballProjection calculates compounding with and without DRIP", () => {
  // Test with DRIP:
  const resultDrip = runSnowballProjection({
    initialPortfolioValue: 10000,
    initialAnnualDividends: 400, // 4% yield
    monthlyContribution: 100,
    reinvestDividends: true,
    dividendGrowthRate: 0.05,
    expectedPriceAppreciation: 0.05,
    timeHorizonYears: 10,
  });

  assert.ok(resultDrip.points[10].portfolioValue > 10000);
  assert.ok(resultDrip.totalDividendsReceived > 0);
  assert.ok(resultDrip.finalYieldOnCost > 4.0);

  // Test without DRIP:
  const resultNoDrip = runSnowballProjection({
    initialPortfolioValue: 10000,
    initialAnnualDividends: 400,
    monthlyContribution: 100,
    reinvestDividends: false,
    dividendGrowthRate: 0.05,
    expectedPriceAppreciation: 0.05,
    timeHorizonYears: 10,
  });

  // Reinvested dividends compound value, so portfolio value with DRIP must be strictly greater than without DRIP
  assert.ok(resultDrip.points[10].portfolioValue > resultNoDrip.points[10].portfolioValue);
});

test("runSnowballProjection identifies crossover year correctly", () => {
  // Setup inputs to cross contribution line quickly
  const result = runSnowballProjection({
    initialPortfolioValue: 100000,
    initialAnnualDividends: 8000, // 8% yield = $8000/yr
    monthlyContribution: 50, // $600/yr contributions
    reinvestDividends: true,
    dividendGrowthRate: 0.05,
    expectedPriceAppreciation: 0.05,
    timeHorizonYears: 5,
  });

  // Crossover should happen immediately in Year 1 because $8000 dividends > $600 contributions
  assert.equal(result.crossoverYear, 1);
});
