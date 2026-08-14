import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyEarningsSurprise,
  calculateEarningsStats,
} from "./earnings.ts";

test("classifyEarningsSurprise categorizes beat, miss, meet, and unreported", () => {
  assert.equal(classifyEarningsSurprise(1.5, 1.4), "beat");
  assert.equal(classifyEarningsSurprise(1.2, 1.4), "miss");
  assert.equal(classifyEarningsSurprise(1.4, 1.4), "meet");
  assert.equal(classifyEarningsSurprise(null, 1.4), "unreported");
  assert.equal(classifyEarningsSurprise(1.4, null), "unreported");
  assert.equal(classifyEarningsSurprise(null, null), "unreported");
});

test("calculateEarningsStats calculates beat rates and average surprise", () => {
  const surprises = [
    {
      symbol: "AAPL",
      period: "2026-03-31",
      actual: 1.5,
      estimate: 1.4,
      surprise: 0.1,
      surprisePercent: 7.14,
    },
    {
      symbol: "AAPL",
      period: "2025-12-31",
      actual: 2.1,
      estimate: 2.0,
      surprise: 0.1,
      surprisePercent: 5.0,
    },
    {
      symbol: "AAPL",
      period: "2025-09-30",
      actual: 1.0,
      estimate: 1.1,
      surprise: -0.1,
      surprisePercent: -9.09,
    },
    {
      symbol: "AAPL",
      period: "2025-06-30",
      actual: 1.2,
      estimate: 1.2,
      surprise: 0,
      surprisePercent: 0,
    },
  ];

  const stats = calculateEarningsStats(surprises);
  assert.equal(stats.totalQuarters, 4);
  assert.equal(stats.beatCount, 2);
  assert.equal(stats.missCount, 1);
  assert.equal(stats.meetCount, 1);
  assert.equal(stats.beatRatePercent, 50);
  assert.ok(stats.averageSurprisePercent !== null);
  assert.ok(Math.abs(stats.averageSurprisePercent - 0.76) < 0.1);
});

test("calculateEarningsStats handles empty or all-null surprise lists", () => {
  assert.deepEqual(calculateEarningsStats([]), {
    totalQuarters: 0,
    beatCount: 0,
    missCount: 0,
    meetCount: 0,
    beatRatePercent: 0,
    averageSurprisePercent: null,
  });

  const nullSurprises = [
    {
      symbol: "XYZ",
      period: "2026-03-31",
      actual: null,
      estimate: null,
      surprise: null,
      surprisePercent: null,
    },
  ];
  const nullStats = calculateEarningsStats(nullSurprises);
  assert.equal(nullStats.beatCount, 0);
  assert.equal(nullStats.beatRatePercent, 0);
  assert.equal(nullStats.averageSurprisePercent, null);
});
