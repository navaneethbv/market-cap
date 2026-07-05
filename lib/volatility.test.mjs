import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateProjectedMove,
  calculateProjectedPrice,
  getBetaVolatilityLabel,
} from "./volatility.ts";

test("calculateProjectedMove computes beta-scaled returns", () => {
  assert.equal(calculateProjectedMove(1.5, -10), -15.0);
  assert.equal(calculateProjectedMove(0.8, 5.5), 4.4);
  assert.equal(calculateProjectedMove(1.2, 0), 0.0);
});

test("calculateProjectedPrice computes final value from base and return", () => {
  assert.equal(calculateProjectedPrice(100.0, 10), 110.0);
  assert.equal(calculateProjectedPrice(150.0, -10), 135.0);
  assert.equal(calculateProjectedPrice(50.0, 0), 50.0);
});

test("getBetaVolatilityLabel categorizes beta correctly", () => {
  assert.equal(getBetaVolatilityLabel(0.5).label, "Low Volatility (Defensive)");
  assert.equal(getBetaVolatilityLabel(1.0).label, "Market Volatility (Average)");
  assert.equal(getBetaVolatilityLabel(1.5).label, "High Volatility (Aggressive)");
});
