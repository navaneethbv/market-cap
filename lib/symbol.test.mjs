import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isValidSymbol,
  normalizeSymbol,
  splitSymbols,
  SYMBOL_PATTERN,
} from "./symbol.ts";

test("SYMBOL_PATTERN matches valid equity tickers", () => {
  assert.ok(SYMBOL_PATTERN.test("AAPL"));
  assert.ok(SYMBOL_PATTERN.test("BRK.B"));
  assert.ok(SYMBOL_PATTERN.test("RDS-A"));
  assert.ok(SYMBOL_PATTERN.test("GOOGL"));
  assert.ok(SYMBOL_PATTERN.test("^SPX"));
  assert.ok(SYMBOL_PATTERN.test("BABA123"));
  assert.ok(!SYMBOL_PATTERN.test("DROP TABLE"));
  assert.ok(!SYMBOL_PATTERN.test(""));
  assert.ok(!SYMBOL_PATTERN.test("A".repeat(13)));
  assert.ok(!SYMBOL_PATTERN.test("AA PL"));
  assert.equal(isValidSymbol("AAPL"), true);
  assert.equal(isValidSymbol("bad ticker"), false);
});

test("normalizeSymbol trims and uppercases", () => {
  assert.equal(normalizeSymbol("  aapl "), "AAPL");
  assert.equal(normalizeSymbol("brk.b"), "BRK.B");
});

test("splitSymbols splits on commas and whitespace, dedupes, filters", () => {
  assert.deepEqual(
    splitSymbols(" aapl, MSFT, AAPL, GOOG$$, qqq, spy "),
    ["AAPL", "MSFT", "QQQ", "SPY"]
  );
  assert.deepEqual(
    splitSymbols("nvda msft\taapl"),
    ["NVDA", "MSFT", "AAPL"]
  );
  assert.deepEqual(splitSymbols("AAPL,MSFT,GOOGL", 2), ["AAPL", "MSFT"]);
});
