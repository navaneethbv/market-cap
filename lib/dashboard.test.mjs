import assert from "node:assert/strict";
import { test } from "node:test";

const { buildDashboardSnapshot } = await import("./dashboard.ts");

test("buildDashboardSnapshot limits watchlist rows and news", () => {
  const snapshot = buildDashboardSnapshot({
    indexes: [
      { symbol: "SPY", price: 500 },
      { symbol: "QQQ", price: 420 },
      { symbol: "DIA", price: 390 },
    ],
    watchlistRows: [
      { symbol: "AAPL" },
      { symbol: "MSFT" },
      { symbol: "NVDA" },
      { symbol: "GOOGL" },
    ],
    articles: [
      { id: 1, headline: "One" },
      { id: 2, headline: "Two" },
      { id: 3, headline: "Three" },
      { id: 4, headline: "Four" },
      { id: 5, headline: "Five" },
    ],
  });

  assert.deepEqual(snapshot.indexSymbols, ["SPY", "QQQ", "DIA"]);
  assert.deepEqual(
    snapshot.watchlistPreview.map((row) => row.symbol),
    ["AAPL", "MSFT", "NVDA"]
  );
  assert.deepEqual(
    snapshot.newsPreview.map((article) => article.headline),
    ["One", "Two", "Three", "Four"]
  );
});
