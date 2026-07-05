import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateWeightedBeta,
  calculateHHI,
  getHHILabel,
} from "./risk.ts";

const mockAssets = [
  { symbol: "AAPL", value: 6000, beta: 1.2 },
  { symbol: "KO", value: 4000, beta: 0.6 },
];

test("calculateWeightedBeta aggregates beta based on asset weights", () => {
  // Total Value = 10000.
  // AAPL weight = 60%, KO weight = 40%.
  // Weighted Beta = 0.6 * 1.2 + 0.4 * 0.6 = 0.72 + 0.24 = 0.96.
  const beta = calculateWeightedBeta(mockAssets);
  assert.equal(beta.toFixed(2), "0.96");

  assert.equal(calculateWeightedBeta([]), 1.0);
});

test("calculateHHI and getHHILabel reports concentration correct score", () => {
  // AAPL: 60%, KO: 40%
  // HHI = 60^2 + 40^2 = 3600 + 1600 = 5200.
  const hhi = calculateHHI(mockAssets);
  assert.equal(hhi, 5200);

  const label = getHHILabel(hhi);
  assert.equal(label.label, "Highly Concentrated");

  const labelEmpty = getHHILabel(0);
  assert.equal(labelEmpty.label, "Empty");

  const labelDiv = getHHILabel(1000);
  assert.equal(labelDiv.label, "Highly Diversified");

  const labelMod = getHHILabel(2000);
  assert.equal(labelMod.label, "Moderately Concentrated");
});
