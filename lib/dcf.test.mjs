import assert from "node:assert/strict";
import { test } from "node:test";
import { computeDCF } from "./dcf.ts";

test("DCF discounts the entered assumptions without changing the discount rate", () => {
  // No growth: five payments plus their terminal perpetuity equals EPS / discount.
  assert.ok(Math.abs(computeDCF(10, 0, 10, 0) - 100) < 1e-9);
  // Equal 10% growth and discount: five $10 present-value payments plus $100 terminal value.
  assert.ok(Math.abs(computeDCF(10, 10, 10, 0) - 150) < 1e-9);
  assert.ok(computeDCF(10, 5, 10, 2) > computeDCF(10, 5, 12, 2));
});

test("invalid perpetuity assumptions do not produce a valuation", () => {
  assert.equal(computeDCF(8.72, 10, 5, 5), null);
  assert.equal(computeDCF(8.72, 10, 4, 5), null);
  for (const eps of [0, -1, NaN, Infinity]) assert.equal(computeDCF(eps, 10, 9, 2), null);
  for (const value of [NaN, Infinity]) {
    assert.equal(computeDCF(10, value, 9, 2), null);
    assert.equal(computeDCF(10, 10, value, 2), null);
    assert.equal(computeDCF(10, 10, 9, value), null);
  }
});
