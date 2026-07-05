import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeBacktestOptions, runBacktest } from "./backtester.ts";

test("normalizeBacktestOptions parses defaults and rejects invalid strategy options", () => {
  assert.deepEqual(
    normalizeBacktestOptions({
      strategy: "sma_crossover",
      initialCapital: null,
      smaShort: null,
      smaLong: null,
      rsiPeriod: null,
      rsiOversold: null,
      rsiOverbought: null,
    }),
    {
      initialCapital: 10000,
      smaShort: 20,
      smaLong: 50,
      rsiPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 70,
    }
  );

  assert.throws(
    () =>
      normalizeBacktestOptions({
        strategy: "sma_crossover",
        initialCapital: "10000",
        smaShort: "50",
        smaLong: "20",
        rsiPeriod: "14",
        rsiOversold: "30",
        rsiOverbought: "70",
      }),
    /short SMA period must be less than long SMA period/
  );

  assert.throws(
    () =>
      normalizeBacktestOptions({
        strategy: "sma_crossover",
        initialCapital: "abc",
        smaShort: "20",
        smaLong: "50",
        rsiPeriod: "14",
        rsiOversold: "30",
        rsiOverbought: "70",
      }),
    /invalid initial capital/
  );

  assert.throws(
    () =>
      normalizeBacktestOptions({
        strategy: "rsi_threshold",
        initialCapital: "10000",
        smaShort: "20",
        smaLong: "50",
        rsiPeriod: "14",
        rsiOversold: "80",
        rsiOverbought: "70",
      }),
    /RSI oversold threshold must be less than overbought threshold/
  );

  assert.equal(
    normalizeBacktestOptions({
      strategy: "rsi_threshold",
      initialCapital: "10000",
      smaShort: "50",
      smaLong: "20",
      rsiPeriod: "14",
      rsiOversold: "30",
      rsiOverbought: "70",
    }).smaShort,
    50
  );
});

test("runBacktest returns defaults on empty candles", () => {
  const result = runBacktest({
    candles: [],
    strategy: "sma_crossover",
    initialCapital: 10000,
  });

  assert.equal(result.points.length, 0);
  assert.equal(result.trades.length, 0);
  assert.equal(result.totalReturn, 0);
  assert.equal(result.buyAndHoldReturn, 0);
  assert.equal(result.maxDrawdown, 0);
  assert.equal(result.winRate, 0);
  assert.equal(result.tradeCount, 0);
});

test("runBacktest handles SMA Crossover strategy golden/death cross signals", () => {
  // Let's create candles such that short SMA (3-day) crosses over long SMA (5-day)
  // Day 0: 100
  // Day 1: 100
  // Day 2: 100
  // Day 3: 100
  // Day 4: 100
  // Short SMA (3-day): Day 2=100, Day 3=100, Day 4=100
  // Long SMA (5-day): Day 4=100
  // Index 4: short=100, long=100
  // Day 5: 120 -> Short SMA (Day 3-5) = (100+100+120)/3 = 106.67
  //             Long SMA (Day 1-5) = (100+100+100+100+120)/5 = 104.00
  //             Short > Long (crossover buy at day 5 close)
  // Day 6: 130
  // Day 7: 90  -> Short SMA (Day 5-7) = (120+130+90)/3 = 113.33
  //             Long SMA (Day 3-7) = (100+100+120+130+90)/5 = 108.00
  // Day 8: 80  -> Short SMA (Day 6-8) = (130+90+80)/3 = 100
  //             Long SMA (Day 4-8) = (100+120+130+90+80)/5 = 104
  //             Short < Long (crossover sell at day 8 close)
  const candles = [
    { time: "2026-06-01", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-02", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-03", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-04", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-05", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-06", open: 120, high: 120, low: 120, close: 120, volume: 100 }, // Buy Cross
    { time: "2026-06-07", open: 130, high: 130, low: 130, close: 130, volume: 100 },
    { time: "2026-06-08", open: 90, high: 90, low: 90, close: 90, volume: 100 },
    { time: "2026-06-09", open: 80, high: 80, low: 80, close: 80, volume: 100 },   // Sell Cross
    { time: "2026-06-10", open: 85, high: 85, low: 85, close: 85, volume: 100 },
  ];

  const result = runBacktest({
    candles,
    strategy: "sma_crossover",
    initialCapital: 10000,
    smaShort: 3,
    smaLong: 5,
  });

  // Verify trades
  assert.ok(result.trades.length >= 2);
  assert.equal(result.trades[0].type, "buy");
  assert.equal(result.trades[0].price, 120);
  assert.equal(result.trades[1].type, "sell");
  assert.equal(result.trades[1].price, 80);

  // Buy price 120, sell price 80 -> loss trade
  assert.equal(result.winRate, 0);
  assert.equal(result.tradeCount, 2);
  assert.ok(result.totalReturn < 0);
});

test("runBacktest handles RSI Threshold strategy oversold/overbought boundaries", () => {
  // Let's create candles to fluctuate RSI values
  // We want RSI to dip below 30 and then rise above 70
  const candles = [
    { time: "2026-05-31", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-01", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-02", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-03", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-04", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    { time: "2026-06-05", open: 100, high: 100, low: 100, close: 100, volume: 100 },
    // Drop to trigger oversold crossover (<30)
    { time: "2026-06-06", open: 90, high: 90, low: 90, close: 90, volume: 100 },
    { time: "2026-06-07", open: 80, high: 80, low: 80, close: 80, volume: 100 },
    { time: "2026-06-08", open: 70, high: 70, low: 70, close: 70, volume: 100 },
    { time: "2026-06-09", open: 60, high: 60, low: 60, close: 60, volume: 100 },
    { time: "2026-06-10", open: 50, high: 50, low: 50, close: 50, volume: 100 },
    { time: "2026-06-11", open: 40, high: 40, low: 40, close: 40, volume: 100 },
    // Rally to trigger overbought crossover (>70)
    { time: "2026-06-12", open: 50, high: 50, low: 50, close: 50, volume: 100 },
    { time: "2026-06-13", open: 65, high: 65, low: 65, close: 65, volume: 100 },
    { time: "2026-06-14", open: 80, high: 80, low: 80, close: 80, volume: 100 },
    { time: "2026-06-15", open: 95, high: 95, low: 95, close: 95, volume: 100 },
    { time: "2026-06-16", open: 110, high: 110, low: 110, close: 110, volume: 100 },
    { time: "2026-06-17", open: 125, high: 125, low: 125, close: 125, volume: 100 },
    { time: "2026-06-18", open: 140, high: 140, low: 140, close: 140, volume: 100 },
    { time: "2026-06-19", open: 155, high: 155, low: 155, close: 155, volume: 100 },
  ];

  const result = runBacktest({
    candles,
    strategy: "rsi_threshold",
    initialCapital: 10000,
    rsiPeriod: 5,
    rsiOversold: 30,
    rsiOverbought: 70,
  });

  // Check that trades took place
  assert.ok(result.trades.length >= 2);
  assert.equal(result.trades[0].type, "buy");
  assert.equal(result.trades[1].type, "sell");
  assert.ok(result.trades[1].price > result.trades[0].price);

  // Buy price < sell price -> profitable trade -> 100% win rate
  assert.equal(result.winRate, 100);
});
