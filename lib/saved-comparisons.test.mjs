import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSavedComparisonInput } from "./saved-comparisons.ts";

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
});
