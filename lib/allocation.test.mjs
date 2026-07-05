import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAllocationRows,
  calculateAllocationSummary,
  getConcentrationLabel,
} from "./allocation.ts";

test("buildAllocationRows sorts positions by portfolio weight", () => {
  const rows = buildAllocationRows([
    { symbol: "MSFT", marketValue: 1500 },
    { symbol: "AAPL", marketValue: 500 },
    { symbol: "CASH", marketValue: null },
  ]);

  assert.deepEqual(
    rows.map((row) => [row.symbol, row.weightPercent]),
    [
      ["MSFT", 75],
      ["AAPL", 25],
      ["CASH", null],
    ]
  );
});

test("calculateAllocationSummary reports concentration", () => {
  const summary = calculateAllocationSummary([
    { symbol: "MSFT", marketValue: 1500 },
    { symbol: "AAPL", marketValue: 500 },
  ]);

  assert.equal(summary.totalMarketValue, 2000);
  assert.equal(summary.positionCount, 2);
  assert.equal(summary.largest?.symbol, "MSFT");
  assert.equal(summary.largestWeightPercent, 75);
});

test("getConcentrationLabel describes largest position risk", () => {
  assert.equal(getConcentrationLabel(42), "High concentration");
  assert.equal(getConcentrationLabel(24), "Moderate concentration");
  assert.equal(getConcentrationLabel(12), "Balanced");
});
