import assert from "node:assert/strict";
import { test } from "node:test";

const { formatCompact, formatNumber, formatPrice, timeAgo } = await import(
  "./format.ts"
);

test("formatPrice renders a fixed USD currency value", () => {
  assert.equal(formatPrice(1234.5), "$1,234.50");
});

test("formatCompact renders compact dollar values and hides zero", () => {
  assert.equal(formatCompact(3_240_000_000_000), "$3.24T");
  assert.equal(formatCompact(0), "-");
});

test("formatNumber respects the requested decimal precision", () => {
  assert.equal(formatNumber(31.256, 1), "31.3");
});

test("timeAgo returns compact relative labels", () => {
  const originalNow = Date.now;
  Date.now = () => 1_700_000_000_000;
  try {
    assert.equal(timeAgo(1_700_000_000 - 30), "just now");
    assert.equal(timeAgo(1_700_000_000 - 600), "10m ago");
    assert.equal(timeAgo(1_700_000_000 - 7_200), "2h ago");
    assert.equal(timeAgo(1_700_000_000 - 172_800), "2d ago");
  } finally {
    Date.now = originalNow;
  }
});
