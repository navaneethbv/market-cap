import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAlertNotifications } from "./notifications.ts";

test("evaluateAlertNotifications correctly identifies triggered alerts above and below", () => {
  const alerts = [
    {
      id: "a1",
      user_id: "u1",
      symbol: "AAPL",
      target_price: 180,
      direction: "above",
      created_at: new Date().toISOString(),
    },
    {
      id: "a2",
      user_id: "u1",
      symbol: "MSFT",
      target_price: 400,
      direction: "below",
      created_at: new Date().toISOString(),
    },
    {
      id: "a3",
      user_id: "u1",
      symbol: "NVDA",
      target_price: 150,
      direction: "above",
      created_at: new Date().toISOString(),
    },
  ];

  const quotesMap = {
    AAPL: { price: 185, symbol: "AAPL" }, // triggered above (185 >= 180)
    MSFT: { price: 395, symbol: "MSFT" }, // triggered below (395 <= 400)
    NVDA: { price: 140, symbol: "NVDA" }, // not triggered (140 < 150)
  };

  const result = evaluateAlertNotifications(alerts, quotesMap);
  assert.equal(result.triggeredCount, 2);
  assert.equal(result.notifications.length, 3);
  assert.equal(result.notifications[0].isTriggered, true);
  assert.equal(result.notifications[1].isTriggered, true);
  assert.equal(result.notifications[2].isTriggered, false);
});

test("evaluateAlertNotifications skips missing quotes safely", () => {
  const alerts = [
    {
      id: "a1",
      user_id: "u1",
      symbol: "AAPL",
      target_price: 180,
      direction: "above",
      created_at: new Date().toISOString(),
    },
  ];

  const result = evaluateAlertNotifications(alerts, {});
  assert.equal(result.triggeredCount, 0);
  assert.equal(result.notifications.length, 0);
});
