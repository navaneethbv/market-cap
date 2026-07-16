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
    assert.equal(candles[0].time, "2026-07-03 16:00:00");
    assert.equal(candles[0].close, 149.0);
    assert.equal(candles[1].time, "2026-07-04 16:00:00");
    assert.equal(candles[1].close, 152.0);
  } finally {
    process.env.TWELVEDATA_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getCandles throws when TWELVEDATA_API_KEY is not set", async () => {
  const originalKey = process.env.TWELVEDATA_API_KEY;
  delete process.env.TWELVEDATA_API_KEY;

  try {
    await assert.rejects(
      () => getCandles("AAPL", "1D"),
      /TWELVEDATA_API_KEY is not set/
    );
  } finally {
    process.env.TWELVEDATA_API_KEY = originalKey;
  }
});

test("getCandles throws when fetch returns non-ok response status", async () => {
  const originalKey = process.env.TWELVEDATA_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.TWELVEDATA_API_KEY = "mock-key";

  globalThis.fetch = async () => {
    return new Response("Internal Server Error", { status: 500 });
  };

  try {
    await assert.rejects(
      () => getCandles("AAPL", "1D"),
      /Twelve Data time_series failed: 500/
    );
  } finally {
    process.env.TWELVEDATA_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getCandles throws when Twelve Data returns status error", async () => {
  const originalKey = process.env.TWELVEDATA_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.TWELVEDATA_API_KEY = "mock-key";

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Invalid API key or subscription plan",
      }),
      { status: 200 }
    );
  };

  try {
    await assert.rejects(
      () => getCandles("AAPL", "1D"),
      /Invalid API key or subscription plan/
    );
  } finally {
    process.env.TWELVEDATA_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getCandles throws when Twelve Data returns status error but no message", async () => {
  const originalKey = process.env.TWELVEDATA_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.TWELVEDATA_API_KEY = "mock-key";

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({ status: "error" }),
      { status: 200 }
    );
  };

  try {
    await assert.rejects(
      () => getCandles("AAPL", "1D"),
      /No candle data for AAPL/
    );
  } finally {
    process.env.TWELVEDATA_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getCandles handles missing volume in Twelve Data values", async () => {
  const originalKey = process.env.TWELVEDATA_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.TWELVEDATA_API_KEY = "mock-key";

  globalThis.fetch = async () => {
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
          },
        ],
      }),
      { status: 200 }
    );
  };

  try {
    const candles = await getCandles("AAPL", "1D");
    assert.equal(candles.length, 1);
    assert.equal(candles[0].volume, 0);
  } finally {
    process.env.TWELVEDATA_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

