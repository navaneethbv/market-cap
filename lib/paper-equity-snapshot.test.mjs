import assert from "node:assert/strict";
import { test } from "node:test";
import { recordPaperEquitySnapshot } from "./paper-equity-snapshot.ts";

const quote = (symbol, price) => ({
  symbol,
  price,
  change: 0,
  changePercent: 0,
  high: price,
  low: price,
  open: price,
  prevClose: price,
  timestamp: 1760000000,
});

const trades = [
  {
    id: "trade-1",
    symbol: "AAPL",
    side: "buy",
    shares: 4,
    price: 10,
    executed_at: "2026-10-04T10:00:00Z",
  },
];

test("records equity from starting cash, the trade ledger, and live quotes", async () => {
  const saved = [];
  const result = await recordPaperEquitySnapshot("user-1", {
    async loadStartingCash(userId) {
      assert.equal(userId, "user-1");
      return 1000;
    },
    async loadTrades(userId) {
      assert.equal(userId, "user-1");
      return trades;
    },
    async getQuotes(symbols) {
      assert.deepEqual(symbols, ["AAPL"]);
      return [{ status: "fulfilled", value: quote("AAPL", 12) }];
    },
    async saveSnapshot(userId, equity) {
      saved.push({ userId, equity });
    },
  });

  assert.deepEqual(result, { equity: 1008, usedCostBasisFallback: false });
  assert.deepEqual(saved, [{ userId: "user-1", equity: 1008 }]);
});

test("records the existing cost-basis fallback when a holding quote is unavailable", async () => {
  let savedEquity;
  const result = await recordPaperEquitySnapshot("user-1", {
    async loadStartingCash() {
      return 1000;
    },
    async loadTrades() {
      return trades;
    },
    async getQuotes() {
      return [{ status: "rejected", reason: new Error("quote unavailable") }];
    },
    async saveSnapshot(_userId, equity) {
      savedEquity = equity;
    },
  });

  assert.deepEqual(result, { equity: 1000, usedCostBasisFallback: true });
  assert.equal(savedEquity, 1000);
});

test("propagates snapshot persistence failures instead of silently ignoring them", async () => {
  await assert.rejects(
    () =>
      recordPaperEquitySnapshot("user-1", {
        async loadStartingCash() {
          return 1000;
        },
        async loadTrades() {
          return trades;
        },
        async getQuotes() {
          return [{ status: "fulfilled", value: quote("AAPL", 12) }];
        },
        async saveSnapshot() {
          throw new Error("snapshot write failed");
        },
      }),
    /snapshot write failed/
  );
});
