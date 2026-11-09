import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimitBucketKey } from "./rate-limit.ts";

test("different symbols on the same route share one bucket", () => {
  assert.equal(
    rateLimitBucketKey("/api/stock/AAPL/beta", "203.0.113.7"),
    rateLimitBucketKey("/api/stock/MSFT/beta", "203.0.113.7")
  );
});

test("different routes and different clients get separate buckets", () => {
  assert.notEqual(
    rateLimitBucketKey("/api/quote", "203.0.113.7"),
    rateLimitBucketKey("/api/search", "203.0.113.7")
  );
  assert.notEqual(
    rateLimitBucketKey("/api/quote", "203.0.113.7"),
    rateLimitBucketKey("/api/quote", "198.51.100.2")
  );
});

test("paths outside the market data routes are not limited", () => {
  assert.equal(rateLimitBucketKey("/portfolio", "203.0.113.7"), null);
  assert.equal(rateLimitBucketKey("/api/portfolio/summary", "203.0.113.7"), null);
});
