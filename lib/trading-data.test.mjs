import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllPaperTrades } from "../app/trading/data.ts";

test("fetchAllPaperTrades fetches and parses trades across pagination pages", async () => {
  const mockTradesPage1 = Array.from({ length: 1000 }, (_, i) => ({
    id: `trade-${i}`,
    symbol: "AAPL",
    side: "buy",
    shares: "10",
    price: "150.5",
    executed_at: "2026-08-01T10:00:00Z",
  }));

  const mockTradesPage2 = [
    {
      id: "trade-1000",
      symbol: "MSFT",
      side: "sell",
      shares: "5",
      price: "400.0",
      executed_at: "2026-08-02T10:00:00Z",
    },
  ];

  const mockSupabase = {
    from(table) {
      assert.equal(table, "paper_trades");
      return {
        select() {
          return {
            eq(col, val) {
              assert.equal(col, "user_id");
              assert.equal(val, "user-123");
              return {
                order() {
                  return {
                    order() {
                      return {
                        async range(from) {
                          if (from === 0) {
                            return { data: mockTradesPage1, error: null };
                          } else if (from === 1000) {
                            return { data: mockTradesPage2, error: null };
                          }
                          return { data: [], error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const trades = await fetchAllPaperTrades(mockSupabase, "user-123");
  assert.equal(trades.length, 1001);
  assert.equal(typeof trades[0].shares, "number");
  assert.equal(trades[0].shares, 10);
  assert.equal(trades[0].price, 150.5);
  assert.equal(trades[1000].id, "trade-1000");
  assert.equal(trades[1000].shares, 5);
});

test("fetchAllPaperTrades throws on Supabase query error", async () => {
  const mockSupabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    order() {
                      return {
                        async range() {
                          return { data: null, error: { message: "Database connection failed" } };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  await assert.rejects(
    () => fetchAllPaperTrades(mockSupabase, "user-123"),
    { message: "Database connection failed" }
  );
});
