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

test("small strikes terminate and retain exact payoff corners", () => {
  for (const strike of [0.01, 0.1, 1, 1.25]) {
    const result = calculatePayoffCurve("long_call", strike, strike, 0.05);
    assert.ok(result.points.length >= 81 && result.points.length <= 86);
    assert.equal(result.points.find((point) => point.price === strike).pnl, -5);
    assert.equal(result.points.find((point) => point.price === strike + 0.05).pnl, 0);
    assert.equal(result.points[0].price, 0);
  }
});

test("rejects invalid trade parameters instead of inventing results", () => {
  for (const contracts of [-1, 0, 0.5, 101, NaN, Infinity]) {
    assert.throws(() => calculatePayoffCurve("long_call", 100, 100, 5, contracts), /Contracts/);
  }
  for (const price of [-1, 0, NaN, Infinity, 1e20]) {
    assert.throws(() => calculatePayoffCurve("long_call", price, 100, 5), /Spot/);
    assert.throws(() => calculatePayoffCurve("long_call", 100, price, 5), /Strike/);
  }
  for (const premium of [-1, NaN, Infinity]) {
    assert.throws(() => calculatePayoffCurve("long_call", 100, 100, premium), /Premium/);
  }
  assert.throws(() => calculatePayoffCurve("unknown", 100, 100, 5), /supported/);
});

test("requires correctly ordered spread strikes", () => {
  for (const second of [90, 100, NaN, Infinity]) {
    assert.throws(() => calculatePayoffCurve("bull_call_spread", 100, 100, 5, 1, second));
  }
  for (const second of [100, 110, 0, NaN]) {
    assert.throws(() => calculatePayoffCurve("bear_put_spread", 100, 100, 5, 1, second));
  }
});

test("never advertises unattainable breakevens or negative risk limits", () => {
  for (const args of [
    ["long_put", 100, 100, 105],
    ["covered_call", 120, 100, 5],
    ["bull_call_spread", 100, 100, 15, 1, 110],
    ["bear_put_spread", 100, 100, 15, 1, 90],
  ]) {
    const result = calculatePayoffCurve(...args);
    assert.equal(result.maxProfit, 0);
    assert.deepEqual(result.breakevens, []);
    assert.ok(result.points.every((point) => point.pnl <= 0));
  }
  const put = calculatePayoffCurve("cash_secured_put", 100, 100, 105);
  assert.equal(put.maxLoss, 0);
  assert.deepEqual(put.breakevens, []);
});

test("includes remote secondary strikes and matches contract scaling", () => {
  const result = calculatePayoffCurve("bull_call_spread", 100, 100, 5, 2, 200);
  assert.equal(result.maxProfit, 19000);
  assert.equal(result.points.find((p) => p.price === 200).pnl, 19000);
});

test("target price analysis agrees with all six payoff curves", async () => {
  const { calculateExpirationPayoff } = await import("./options-payoff.ts");
  for (const strategy of ["long_call", "long_put", "covered_call", "cash_secured_put", "bull_call_spread", "bear_put_spread"]) {
    const args = [100, 100, 5, 2];
    const result = calculatePayoffCurve(strategy, ...args);
    for (const point of result.points) {
      assert.equal(calculateExpirationPayoff(strategy, point.price, ...args), point.pnl);
    }
  }
  assert.equal(calculateExpirationPayoff("long_call", 120, 100, 100, 5, 2), 3000);
  assert.throws(() => calculateExpirationPayoff("long_call", -1, 100, 100, 5), /Expiration/);
});
