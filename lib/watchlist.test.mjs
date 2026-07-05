import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildWatchlistRows,
  getSafeWatchlistNextPath,
  isWatchlistSymbol,
  normalizeWatchlistSymbol,
} = await import("./watchlist.ts");

test("normalizeWatchlistSymbol trims and uppercases user input", () => {
  assert.equal(normalizeWatchlistSymbol(" aapl "), "AAPL");
});

test("isWatchlistSymbol accepts US ticker-like symbols only", () => {
  assert.equal(isWatchlistSymbol("BRK.B"), true);
  assert.equal(isWatchlistSymbol("QQQ"), true);
  assert.equal(isWatchlistSymbol("TOO_LONG_SYMBOL"), false);
  assert.equal(isWatchlistSymbol("DROP TABLE"), false);
});

test("getSafeWatchlistNextPath keeps same-origin paths only", () => {
  assert.equal(getSafeWatchlistNextPath("/stock/AAPL"), "/stock/AAPL");
  assert.equal(getSafeWatchlistNextPath("//evil.example"), "/watchlist");
  assert.equal(getSafeWatchlistNextPath("https://evil.example"), "/watchlist");
  assert.equal(getSafeWatchlistNextPath(null), "/watchlist");
});

test("buildWatchlistRows preserves item order and records quote failures", () => {
  const items = [
    { id: "1", symbol: "AAPL", created_at: "2026-07-04T00:00:00Z" },
    { id: "2", symbol: "MSFT", created_at: "2026-07-04T01:00:00Z" },
  ];
  const quote = {
    symbol: "AAPL",
    price: 212.4,
    change: 1.25,
    changePercent: 0.59,
    high: 214.1,
    low: 209.3,
    open: 210.5,
    prevClose: 211.15,
    timestamp: 1760000000,
  };

  assert.deepEqual(
    buildWatchlistRows(items, [
      { status: "fulfilled", value: quote },
      { status: "rejected", reason: new Error("rate limited") },
    ]),
    [
      {
        symbol: "AAPL",
        addedAt: "2026-07-04T00:00:00Z",
        quote,
        error: null,
      },
      {
        symbol: "MSFT",
        addedAt: "2026-07-04T01:00:00Z",
        quote: null,
        error: "rate limited",
      },
    ]
  );
});
