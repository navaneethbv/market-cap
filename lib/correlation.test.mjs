import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateCorrelation,
  getMockHistoricalPrices,
  getCorrelationLabel,
} from "./correlation.ts";

test("calculateCorrelation calculates Pearson coefficient", () => {
  // Purely correlated
  assert.equal(calculateCorrelation([10, 20, 30], [100, 200, 300]), 1.0);
  
  // Purely negatively correlated
  assert.equal(calculateCorrelation([10, 20, 30], [300, 200, 100]), -1.0);

  // Uncorrelated
  assert.equal(calculateCorrelation([10, 20, 10], [50, 50, 100]), -0.5);

  // Error boundary checks
  assert.equal(calculateCorrelation([], [1, 2]), 0.0);
  assert.equal(calculateCorrelation([1], [1]), 0.0);
});

test("getMockHistoricalPrices resolves stable series for symbol", () => {
  const aapl = getMockHistoricalPrices("AAPL");
  assert.equal(aapl.length, 10);
  assert.equal(aapl[0], 180.2);

  const custom = getMockHistoricalPrices("XYZ");
  assert.equal(custom.length, 10);
});

test("getCorrelationLabel describes correlation thresholds", () => {
  assert.equal(getCorrelationLabel(0.85).label, "Strong Positive");
  assert.equal(getCorrelationLabel(0.5).label, "Moderate Positive");
  assert.equal(getCorrelationLabel(0.1).label, "Uncorrelated / Diversified");
  assert.equal(getCorrelationLabel(-0.4).label, "Moderate Negative");
  assert.equal(getCorrelationLabel(-0.85).label, "Strong Negative");
});
