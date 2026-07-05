import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateDailyReturns,
  alignReturns,
  calculatePearsonCorrelation,
  calculateCorrelationMatrix,
  normalizeCorrelationSymbols,
} from "./correlation.ts";

test("normalizeCorrelationSymbols uppercases, dedupes, filters, and caps symbols", () => {
  assert.deepEqual(
    normalizeCorrelationSymbols(" aapl, MSFT, aapl, DROP TABLE, qqq, spy "),
    ["AAPL", "MSFT", "QQQ", "SPY"]
  );

  assert.equal(
    normalizeCorrelationSymbols(
      "A,B,C,D,E,F,G,H,I,J,K,L"
    ).length,
    10
  );
});

test("calculateDailyReturns returns empty map on short candles", () => {
  const map = calculateDailyReturns([]);
  assert.equal(map.size, 0);

  const mapSingle = calculateDailyReturns([
    { time: "2026-06-01", open: 10, high: 10, low: 10, close: 10, volume: 100 },
  ]);
  assert.equal(mapSingle.size, 0);
});

test("calculateDailyReturns calculates correct percentage returns", () => {
  const candles = [
    { time: "2026-06-01", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-02", open: 110, high: 110, low: 110, close: 110, volume: 100 },
    { time: "2026-06-03", open: 99, high: 99, low: 99, close: 99, volume: 100 },
  ];

  const map = calculateDailyReturns(candles);
  assert.equal(map.size, 2);
  assert.equal(map.get("2026-06-02"), 0.1); // (110 - 100) / 100 = 10%
  assert.equal(map.get("2026-06-03"), -0.1); // (99 - 110) / 110 = -10%
});

test("alignReturns filters matching dates only", () => {
  const returnsA = new Map([
    ["2026-06-01", 0.05],
    ["2026-06-02", -0.02],
    ["2026-06-03", 0.01],
  ]);

  const returnsB = new Map([
    ["2026-06-02", 0.04],
    ["2026-06-03", -0.01],
    ["2026-06-04", 0.03],
  ]);

  const aligned = alignReturns(returnsA, returnsB);
  assert.equal(aligned.length, 2);
  assert.equal(aligned[0].date, "2026-06-02");
  assert.equal(aligned[0].returnA, -0.02);
  assert.equal(aligned[0].returnB, 0.04);
  assert.equal(aligned[1].date, "2026-06-03");
  assert.equal(aligned[1].returnA, 0.01);
  assert.equal(aligned[1].returnB, -0.01);
});

test("calculatePearsonCorrelation enforces minimum observations", () => {
  const shortPoints = Array(14).fill(null).map((_, idx) => ({
    date: `2026-06-${idx + 1}`,
    returnA: 0.02,
    returnB: 0.02,
  }));

  const res = calculatePearsonCorrelation(shortPoints);
  assert.equal(res, null);
});

test("calculatePearsonCorrelation calculates correct Pearson coefficient", () => {
  // Let's create exactly 15 points
  // 1. Perfect positive correlation (r = 1.0)
  const perfectPoints = Array(15).fill(null).map((_, idx) => ({
    date: `2026-06-${idx + 1}`,
    returnA: idx * 0.01,
    returnB: idx * 0.01,
  }));

  const rPositive = calculatePearsonCorrelation(perfectPoints);
  assert.ok(rPositive !== null);
  assert.ok(Math.abs(rPositive - 1.0) < 0.0001);

  // 2. Perfect negative correlation (r = -1.0)
  const negativePoints = Array(15).fill(null).map((_, idx) => ({
    date: `2026-06-${idx + 1}`,
    returnA: idx * 0.01,
    returnB: -idx * 0.01,
  }));

  const rNegative = calculatePearsonCorrelation(negativePoints);
  assert.ok(rNegative !== null);
  assert.ok(Math.abs(rNegative - (-1.0)) < 0.0001);

  // 3. Zero variance yields null
  const zeroVariance = Array(15).fill(null).map((_, idx) => ({
    date: `2026-06-${idx + 1}`,
    returnA: 0.02, // constant
    returnB: idx * 0.01,
  }));
  const rZero = calculatePearsonCorrelation(zeroVariance);
  assert.equal(rZero, null);
});

test("calculateCorrelationMatrix calculates cross-correlation", () => {
  const candlesA = Array(16).fill(null).map((_, idx) => ({
    time: `2026-06-${String(idx + 1).padStart(2, "0")}`,
    open: 100 + idx,
    high: 100 + idx,
    low: 100 + idx,
    close: 100 + idx,
    volume: 100,
  }));

  const candlesB = Array(16).fill(null).map((_, idx) => ({
    time: `2026-06-${String(idx + 1).padStart(2, "0")}`,
    open: 100 + idx,
    high: 100 + idx,
    low: 100 + idx,
    close: 100 + idx,
    volume: 100,
  }));

  const result = calculateCorrelationMatrix([
    { symbol: "AAPL", candles: candlesA },
    { symbol: "MSFT", candles: candlesB },
  ]);

  assert.ok(result.matrix.AAPL);
  assert.ok(result.matrix.MSFT);
  assert.equal(result.matrix.AAPL.AAPL, 1.0);
  assert.ok(Math.abs(result.matrix.AAPL.MSFT - 1.0) < 0.0001);
});
