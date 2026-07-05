import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
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
