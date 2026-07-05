import assert from "node:assert/strict";
import { test } from "node:test";
import { getCandles, isChartRange } from "./twelvedata.ts";

test("isChartRange correctly checks allowed ranges", () => {
  assert.ok(isChartRange("1D"));
  assert.ok(isChartRange("1Y"));
  assert.ok(!isChartRange("10Y"));
});

test("getCandles fetches and parses Twelve Data candle series chronological order", async () => {
  const originalKey = process.env.TWELVEDATA_API_KEY;
  const originalFetch = globalThis.fetch;

  process.env.TWELVEDATA_API_KEY = "mock-key";

  globalThis.fetch = async (url) => {
    assert.match(url, /api\.twelvedata\.com\/time_series/);
    return new Response(
      JSON.stringify({
        status: "ok",
        values: [
          {
            datetime: "2026-07-04 16:00:00",
            open: "150.00",
            high: "155.00",
            low: "148.00",
            close: "152.00",
            volume: "1000",
          },
          {
            datetime: "2026-07-03 16:00:00",
            open: "148.00",
            high: "150.00",
            low: "145.00",
            close: "149.00",
            volume: "800",
          },
        ],
      }),
      { status: 200 }
    );
  };

  try {
    const candles = await getCandles("AAPL", "1D");
    assert.equal(candles.length, 2);
    // Verified reversed (chronological order)
    assert.equal(candles[0].time, "2026-07-03 16:00:00");
    assert.equal(candles[0].close, 149.0);
    assert.equal(candles[1].time, "2026-07-04 16:00:00");
    assert.equal(candles[1].close, 152.0);
  } finally {
    process.env.TWELVEDATA_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});
