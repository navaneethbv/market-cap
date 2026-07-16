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

test("calculateAllocationSummary handles positions with null marketValue", () => {
  const summary = calculateAllocationSummary([
    { symbol: "MSFT", marketValue: 1000 },
    { symbol: "AAPL", marketValue: null },
  ]);
  assert.equal(summary.totalMarketValue, 1000);
  assert.equal(summary.positionCount, 2);
  assert.equal(summary.pricedPositionCount, 1);
});

test("calculateAllocationSummary handles all null marketValues", () => {
  const summary = calculateAllocationSummary([
    { symbol: "MSFT", marketValue: null },
    { symbol: "AAPL", marketValue: null },
  ]);
  assert.equal(summary.totalMarketValue, 0);
  assert.equal(summary.largest, null);
  assert.equal(summary.largestWeightPercent, 0);
});

test("buildAllocationRows handles zero totalMarketValue", () => {
  const rows = buildAllocationRows([
    { symbol: "MSFT", marketValue: 0 },
    { symbol: "AAPL", marketValue: 0 },
  ]);
  assert.equal(rows[0].weightPercent, null);
  assert.equal(rows[1].weightPercent, null);
});

