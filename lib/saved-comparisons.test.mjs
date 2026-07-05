import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSavedComparisonInput, isUuid } from "./saved-comparisons.ts";

test("normalizeSavedComparisonInput trims names and normalizes symbols", () => {
  assert.deepEqual(
    normalizeSavedComparisonInput({
      name: "  AI leaders  ",
      symbols: "nvda, msft, nvda",
    }),
    { name: "AI leaders", symbols: ["NVDA", "MSFT"] }
  );
});

test("normalizeSavedComparisonInput accepts symbol arrays", () => {
  assert.deepEqual(
    normalizeSavedComparisonInput({
      name: "Indexes",
      symbols: ["spy", "qqq", "dia"],
    }),
    { name: "Indexes", symbols: ["SPY", "QQQ", "DIA"] }
  );
});

test("normalizeSavedComparisonInput rejects invalid saved comparisons", () => {
  assert.throws(
    () => normalizeSavedComparisonInput({ name: "", symbols: "AAPL,MSFT" }),
    /Name is required/
  );
  assert.throws(
    () => normalizeSavedComparisonInput({ name: "One", symbols: "AAPL" }),
    /Choose 2 to 5 symbols/
  );
  assert.throws(
    () =>
      normalizeSavedComparisonInput({
        name: "x".repeat(61),
        symbols: "AAPL,MSFT",
      }),
    /Name must be 60 characters or fewer/
  );
});

test("isUuid correctly validates UUID format", () => {
  assert.ok(isUuid("123e4567-e89b-12d3-a456-426614174000"));
  assert.ok(!isUuid("invalid-uuid"));
  assert.ok(!isUuid(""));
});
