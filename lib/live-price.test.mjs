import assert from "node:assert/strict";
import { test } from "node:test";

const {
  applyTradeToQuote,
  getLivePriceStatus,
  shouldPollQuote,
} = await import("./live-price.ts");

test("applyTradeToQuote updates price and recomputes change values", () => {
  assert.deepEqual(
    applyTradeToQuote(
      {
        symbol: "AAPL",
        price: 100,
        change: 5,
        changePercent: 5.26,
        high: 105,
        low: 95,
        open: 96,
        prevClose: 95,
        timestamp: 1,
      },
      110,
      2
    ),
    {
      symbol: "AAPL",
      price: 110,
      change: 15,
      changePercent: 15.79,
      high: 110,
      low: 95,
      open: 96,
      prevClose: 95,
      timestamp: 2,
    }
  );
});

test("shouldPollQuote uses a 15 second fallback interval", () => {
  assert.equal(shouldPollQuote({ lastPollAt: 1000, now: 15_999 }), false);
  assert.equal(shouldPollQuote({ lastPollAt: 1000, now: 16_000 }), true);
});

test("getLivePriceStatus distinguishes live, fallback, and idle states", () => {
  assert.equal(getLivePriceStatus({ connected: true, fallback: false }), "Live");
  assert.equal(getLivePriceStatus({ connected: false, fallback: true }), "Polling");
  assert.equal(getLivePriceStatus({ connected: false, fallback: false }), "Waiting");
});
