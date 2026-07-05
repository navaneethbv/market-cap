import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  calculateIndicators,
} from "./indicators.ts";

test("calculateSMA calculates simple moving average correctly", () => {
  const prices = [1, 2, 3, 4, 5];
  const sma = calculateSMA(prices, 3);

  assert.deepEqual(sma, [null, null, 2, 3, 4]);
});

test("calculateEMA calculates exponential moving average correctly", () => {
  const prices = [10, 11, 12, 13, 14];
  const ema = calculateEMA(prices, 3);

  // Period is 3, multiplier k = 2 / (3 + 1) = 0.5
  // Index 0: null
  // Index 1: null
  // Index 2: SMA of first 3 points = (10 + 11 + 12) / 3 = 11
  // Index 3: 13 * 0.5 + 11 * 0.5 = 12
  // Index 4: 14 * 0.5 + 12 * 0.5 = 13
  assert.deepEqual(ema, [null, null, 11, 12, 13]);
});

test("calculateBollingerBands calculates bands correctly", () => {
  const prices = Array(20).fill(10);
  prices[19] = 20; // Last element is 20, rest are 10
  const bands = calculateBollingerBands(prices, 5, 2);

  // We check that bands return null for indices < 4
  assert.equal(bands.upper[0], null);
  assert.equal(bands.middle[0], null);
  assert.equal(bands.lower[0], null);

  // Index 19: prices from 15 to 19: [10, 10, 10, 10, 20]
  // SMA (middle) = 60 / 5 = 12
  // Sq diffs: (10-12)^2 * 4 + (20-12)^2 = 4 * 4 + 64 = 80
  // StdDev = sqrt(80 / 5) = sqrt(16) = 4
  // Upper = 12 + 2 * 4 = 20
  // Lower = 12 - 2 * 4 = 4
  assert.equal(bands.middle[19], 12);
  assert.equal(bands.upper[19], 20);
  assert.equal(bands.lower[19], 4);
});

test("calculateRSI calculates RSI correctly", () => {
  const prices = Array(20).fill(100);
  // Neutral prices, RSI should remain around null or 100/0 depending on directions.
  const rsi = calculateRSI(prices, 14);

  assert.equal(rsi[0], null);
  assert.equal(rsi[13], null);
  // No price movement -> avgLoss = 0, RSI = 100 or is handled
  assert.equal(rsi[14], 100);
});

test("calculateMACD calculates lines correctly", () => {
  const prices = Array(50).fill(100);
  const macd = calculateMACD(prices, 26, 12, 9);

  // With static prices, MACD line will be 0 (EMA 12 is 100, EMA 26 is 100)
  // First valid index for slow period 26 is index 25
  assert.equal(macd.macdLine[24], null);
  assert.equal(macd.macdLine[25], 0);
  assert.equal(macd.signalLine[25 + 8], 0);
  assert.equal(macd.histogram[25 + 8], 0);
});

test("calculateRSI handles short arrays and standard non-zero avgLoss paths", () => {
  const shortRsi = calculateRSI([10, 20], 14);
  assert.deepEqual(shortRsi, [null, null]);

  // Fluctuating prices with some down days (avgLoss > 0)
  const prices = [
    100, 95, 98, 92, 94, 88, 90, 85, 87, 82, 84, 78, 80, 75, 77, 72, 74, 69, 71, 66
  ];
  const rsi = calculateRSI(prices, 14);
  assert.equal(rsi[0], null);
  assert.equal(rsi[13], null);
  assert.ok(rsi[14] !== null && rsi[14] !== 100);
  assert.ok(rsi[19] !== null);
});

test("calculateMACD handles short arrays", () => {
  const macd = calculateMACD([10, 20], 26, 12, 9);
  assert.deepEqual(macd.macdLine, [null, null]);
  assert.deepEqual(macd.signalLine, [null, null]);
  assert.deepEqual(macd.histogram, [null, null]);
});

test("calculateIndicators calculates all indicators correctly", () => {
  const candles = Array(220).fill(null).map((_, idx) => ({
    time: `2026-07-${idx + 1}`,
    open: 100 + idx,
    high: 105 + idx,
    low: 95 + idx,
    close: 101 + idx,
    volume: 1000,
  }));

  const res = calculateIndicators(candles);
  assert.ok(res.sma50);
  assert.ok(res.sma200);
  assert.ok(res.ema20);
  assert.ok(res.bollinger);
  assert.ok(res.rsi);
  assert.ok(res.macd);

  // Index 199 has enough data for SMA 200 (needs index 199)
  assert.ok(res.sma200[198] === null);
  assert.ok(typeof res.sma200[199] === "number");
});
