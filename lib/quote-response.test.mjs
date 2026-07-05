import assert from "node:assert/strict";
import { test } from "node:test";
import { buildQuotePayload } from "./quote-response.ts";

const AAPL_QUOTE = {
  symbol: "AAPL",
  price: 200,
  change: 1,
  changePercent: 0.5,
  high: 201,
  low: 199,
  open: 199.5,
  prevClose: 199,
  timestamp: 1,
};

test("buildQuotePayload returns fulfilled quotes with ok status", () => {
  const result = buildQuotePayload([
    { status: "fulfilled", value: AAPL_QUOTE },
    { status: "rejected", reason: new Error("rate limited") },
  ]);

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { quotes: { AAPL: AAPL_QUOTE } });
});

test("buildQuotePayload returns 502 when every quote failed", () => {
  const result = buildQuotePayload([
    { status: "rejected", reason: new Error("rate limited") },
    { status: "rejected", reason: new Error("upstream unavailable") },
  ]);

  assert.equal(result.status, 502);
  assert.deepEqual(result.body, {
    error: "Failed to load quotes",
    quotes: {},
  });
});
