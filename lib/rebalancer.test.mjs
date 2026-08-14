import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateRebalancePlan, getEqualWeights } from "./rebalancer.ts";

test("getEqualWeights distributes 100% across symbols evenly", () => {
  const weights3 = getEqualWeights(["AAPL", "MSFT", "GOOG"]);
  assert.equal(weights3.AAPL, 33.33);
  assert.equal(weights3.MSFT, 33.33);
  assert.equal(weights3.GOOG, 33.34);
  assert.equal(weights3.AAPL + weights3.MSFT + weights3.GOOG, 100);

  const weights4 = getEqualWeights(["A", "B", "C", "D"]);
  assert.equal(weights4.A, 25);
  assert.equal(weights4.B, 25);
  assert.equal(weights4.C, 25);
  assert.equal(weights4.D, 25);

  assert.deepEqual(getEqualWeights([]), {});
});

test("calculateRebalancePlan computes exact buy and sell orders", () => {
  const holdings = [
    { symbol: "AAPL", shares: 10, price: 100 }, // $1,000 (80%)
    { symbol: "MSFT", shares: 1, price: 250 },  // $250 (20%)
  ]; // Total = $1,250

  // Target 50% AAPL ($625), 50% MSFT ($625)
  const targetWeights = { AAPL: 50, MSFT: 50 };
  const plan = calculateRebalancePlan(holdings, targetWeights);

  assert.equal(plan.totalCurrentValue, 1250);
  assert.equal(plan.totalTargetValue, 1250);
  assert.equal(plan.totalTargetWeight, 100);
  assert.equal(plan.isBalanced, false);

  const aaplRow = plan.rows.find((r) => r.symbol === "AAPL");
  assert.equal(aaplRow?.action, "SELL");
  assert.equal(aaplRow?.targetValue, 625);
  assert.equal(aaplRow?.targetShares, 6.25);
  assert.equal(aaplRow?.deltaValue, -375);

  const msftRow = plan.rows.find((r) => r.symbol === "MSFT");
  assert.equal(msftRow?.action, "BUY");
  assert.equal(msftRow?.targetValue, 625);
  assert.equal(msftRow?.targetShares, 2.5);
  assert.equal(msftRow?.deltaValue, 375);
});

test("calculateRebalancePlan supports adding extra cash", () => {
  const holdings = [
    { symbol: "AAPL", shares: 5, price: 100 }, // $500
  ];

  // Add $500 cash, target 100% AAPL ($1,000 target)
  const plan = calculateRebalancePlan(holdings, { AAPL: 100 }, 500);
  assert.equal(plan.totalCurrentValue, 500);
  assert.equal(plan.totalTargetValue, 1000);
  assert.equal(plan.rows[0].targetShares, 10);
  assert.equal(plan.rows[0].deltaShares, 5);
  assert.equal(plan.rows[0].action, "BUY");
});

test("calculateRebalancePlan identifies already balanced portfolio", () => {
  const holdings = [
    { symbol: "AAPL", shares: 10, price: 100 }, // $1,000 (50%)
    { symbol: "MSFT", shares: 5, price: 200 },  // $1,000 (50%)
  ];
  const plan = calculateRebalancePlan(holdings, { AAPL: 50, MSFT: 50 });
  assert.equal(plan.isBalanced, true);
  assert.equal(plan.rows[0].action, "HOLD");
  assert.equal(plan.rows[1].action, "HOLD");
});
