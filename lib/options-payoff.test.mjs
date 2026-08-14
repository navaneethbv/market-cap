import assert from "node:assert/strict";
import { test } from "node:test";
import { calculatePayoffCurve } from "./options-payoff.ts";

test("calculatePayoffCurve computes Long Call payoff accurately", () => {
  // Buy 100 strike call for $5 premium (1 contract = 100 shares)
  const result = calculatePayoffCurve("long_call", 100, 100, 5, 1);
  assert.equal(result.maxLoss, 500);
  assert.equal(result.maxProfit, "unlimited");
  assert.deepEqual(result.breakevens, [105]);
  assert.ok(result.points.length > 0);

  // At strike 100, PnL should be -$500
  const atStrike = result.points.find((p) => p.price === 100);
  if (atStrike) {
    assert.equal(atStrike.pnl, -500);
  }
});

test("calculatePayoffCurve computes Long Put payoff accurately", () => {
  const result = calculatePayoffCurve("long_put", 100, 100, 5, 1);
  assert.equal(result.maxLoss, 500);
  assert.equal(result.maxProfit, 9500); // (100 - 5) * 100
  assert.deepEqual(result.breakevens, [95]);
});

test("calculatePayoffCurve computes Covered Call payoff accurately", () => {
  // Spot 100, Sell 105 call for $3 premium
  const result = calculatePayoffCurve("covered_call", 100, 105, 3, 1);
  assert.equal(result.maxProfit, 800); // (105 - 100 + 3) * 100
  assert.equal(result.maxLoss, 9700);  // (100 - 3) * 100
  assert.deepEqual(result.breakevens, [97]);
});

test("calculatePayoffCurve computes Cash-Secured Put payoff accurately", () => {
  // Sell 95 put for $4 premium
  const result = calculatePayoffCurve("cash_secured_put", 100, 95, 4, 1);
  assert.equal(result.maxProfit, 400); // 4 * 100
  assert.equal(result.maxLoss, 9100);  // (95 - 4) * 100
  assert.deepEqual(result.breakevens, [91]);
});

test("calculatePayoffCurve computes Bull Call Spread payoff accurately", () => {
  // Buy 100 call, sell 110 call for net $3 debit
  const result = calculatePayoffCurve("bull_call_spread", 100, 100, 3, 1, 110);
  assert.equal(result.maxLoss, 300);
  assert.equal(result.maxProfit, 700); // (10 - 3) * 100
  assert.deepEqual(result.breakevens, [103]);
});

test("calculatePayoffCurve computes Bear Put Spread payoff accurately", () => {
  // Buy 100 put, sell 90 put for net $3 debit
  const result = calculatePayoffCurve("bear_put_spread", 100, 100, 3, 1, 90);
  assert.equal(result.maxLoss, 300);
  assert.equal(result.maxProfit, 700); // (10 - 3) * 100
  assert.deepEqual(result.breakevens, [97]);
});
