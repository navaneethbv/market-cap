import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { loadNotificationFeed } from "./notification-feed.ts";

const fixtureAlerts = [
  { id: "1", symbol: "AAPL", target_price: "180", direction: "above", active: true },
  { id: "2", symbol: "AAPL", target_price: "200", direction: "below", active: true },
  { id: "3", symbol: "MSFT", target_price: "400", direction: "above", active: true },
];

test("notification bell loads owner-scoped active price alerts through PostgREST", async () => {
  const quoteCalls = [];
  const client = createClient("https://fixture.supabase.co", "fixture-key", {
    global: { fetch: async (input) => {
      const url = new URL(input);
      assert.equal(url.pathname, "/rest/v1/price_alerts");
      assert.equal(url.searchParams.get("user_id"), "eq.fixture-user");
      assert.equal(url.searchParams.get("active"), "eq.true");
      assert.equal(url.searchParams.get("order"), "created_at.desc");
      assert.equal(url.searchParams.get("limit"), "10");
      return new Response(JSON.stringify(fixtureAlerts), { headers: { "Content-Type": "application/json" } });
    } },
  });
  const feed = await loadNotificationFeed(client, "fixture-user", async (symbol) => {
    quoteCalls.push(symbol);
    if (symbol === "MSFT") throw new Error("Quote provider unavailable");
    return { symbol, price: 185 };
  });
  assert.equal(feed.triggeredCount, 2);
  assert.equal(feed.notifications.length, 2);
  assert.deepEqual(quoteCalls.sort(), ["AAPL", "MSFT"]);
  assert.equal(feed.notifications[0].message, "AAPL reached $185.00 (above target $180.00)");
});

test("database failures are distinguishable from an empty notification feed", async () => {
  const client = createClient("https://fixture.supabase.co", "fixture-key", {
    global: { fetch: async () => new Response(JSON.stringify({ message: "unavailable" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    }) },
  });
  await assert.rejects(loadNotificationFeed(client, "fixture-user", async () => {
    assert.fail("No quote request should run after a database error");
  }), /Unable to load/);
});
