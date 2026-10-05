import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateRebalancePlan, getEqualWeights } from "./rebalancer.ts";

const liveHolding = (holding) => ({ ...holding, marketPriceAvailable: true });

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
  assert.deepEqual(getEqualWeights(["AAPL", "AAPL", "MSFT"]), {
    AAPL: 50,
    MSFT: 50,
  });
});

test("calculateRebalancePlan computes exact buy and sell orders", () => {
  const holdings = [
    liveHolding({ symbol: "AAPL", shares: 10, price: 100 }), // $1,000 (80%)
    liveHolding({ symbol: "MSFT", shares: 1, price: 250 }),  // $250 (20%)
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

test("calculateRebalancePlan aggregates multiple lots of the same symbol", () => {
  const holdings = [
    liveHolding({ symbol: "AAPL", shares: 4, price: 100 }),
    liveHolding({ symbol: "AAPL", shares: 6, price: 100 }),
    liveHolding({ symbol: "MSFT", shares: 10, price: 100 }),
  ];

  const plan = calculateRebalancePlan(holdings, { AAPL: 50, MSFT: 50 });

  assert.equal(plan.error, null);
  assert.equal(plan.totalCurrentValue, 2000);
  assert.equal(plan.totalTargetWeight, 100);
  assert.equal(plan.rows.length, 2);
  assert.deepEqual(
    plan.rows.map(({ symbol, currentShares, targetValue, action }) => ({
      symbol,
      currentShares,
      targetValue,
      action,
    })),
    [
      { symbol: "AAPL", currentShares: 10, targetValue: 1000, action: "HOLD" },
      { symbol: "MSFT", currentShares: 10, targetValue: 1000, action: "HOLD" },
    ]
  );
});

test("calculateRebalancePlan supports adding extra cash", () => {
  const holdings = [
    liveHolding({ symbol: "AAPL", shares: 5, price: 100 }), // $500
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
    liveHolding({ symbol: "AAPL", shares: 10, price: 100 }), // $1,000 (50%)
    liveHolding({ symbol: "MSFT", shares: 5, price: 200 }),  // $1,000 (50%)
  ];
  const plan = calculateRebalancePlan(holdings, { AAPL: 50, MSFT: 50 });
  assert.equal(plan.isBalanced, true);
  assert.equal(plan.rows[0].action, "HOLD");
  assert.equal(plan.rows[1].action, "HOLD");
});

test("invalid allocations cannot produce executable trade plans", () => {
  const holdings = [
    liveHolding({ symbol: "AAPL", shares: 10, price: 100 }),
    liveHolding({ symbol: "MSFT", shares: 10, price: 100 }),
  ];
  for (const weights of [{ AAPL: 100, MSFT: 50 }, { AAPL: 25, MSFT: 50 }, { AAPL: -10, MSFT: 110 }, { AAPL: NaN, MSFT: 100 }, { AAPL: 50, MSFT: 49.99 }]) {
    const plan = calculateRebalancePlan(holdings, weights);
    assert.ok(plan.error);
    assert.deepEqual(plan.rows, []);
    assert.equal(plan.isBalanced, false);
  }
});

test("unavailable prices and nonfinite cash cannot produce trade instructions", () => {
  const holdings = [liveHolding({ symbol: "AAPL", shares: 10, price: 100 })];
  for (const cash of [NaN, Infinity, -100]) assert.ok(calculateRebalancePlan(holdings, { AAPL: 100 }, cash).error);
  for (const price of [0, NaN, Infinity]) assert.ok(calculateRebalancePlan([{ ...holdings[0], price }], { AAPL: 100 }).error);
});

test("inconsistent prices for duplicate lots cannot produce a plan", () => {
  const plan = calculateRebalancePlan(
    [
      liveHolding({ symbol: "AAPL", shares: 1, price: 100 }),
      liveHolding({ symbol: "AAPL", shares: 1, price: 101 }),
    ],
    { AAPL: 100 }
  );

  assert.match(plan.error, /Valid share counts and current prices/);
  assert.deepEqual(plan.rows, []);
});

test("cost-basis fallback prices cannot produce a rebalance plan", () => {
  const plan = calculateRebalancePlan(
    [{ symbol: "AAPL", shares: 10, price: 100, marketPriceAvailable: false }],
    { AAPL: 100 }
  );

  assert.match(plan.error, /Live market prices are unavailable for AAPL/);
  assert.deepEqual(plan.rows, []);
  assert.equal(plan.isBalanced, false);
});
