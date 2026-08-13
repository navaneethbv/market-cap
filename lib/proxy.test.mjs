import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import proxy, { config } from "../proxy.ts";

// Set environment variables for Supabase client initialization in proxy
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";

test("proxy config matcher is defined", () => {
  assert.ok(Array.isArray(config.matcher));
  assert.ok(config.matcher.length > 0);
});

test("proxy allows public non-rate-limited paths for signed-out users", async () => {
  const req = new NextRequest("https://example.com/");
  const res = await proxy(req);
  assert.equal(res.status, 200);
});

test("proxy redirects signed-out users away from protected paths", async () => {
  const protectedPaths = [
    "/portfolio",
    "/watchlist",
    "/alerts",
    "/compare/saved",
    "/trading",
  ];

  for (const path of protectedPaths) {
    const req = new NextRequest(`https://example.com${path}`);
    const res = await proxy(req);
    assert.equal(res.status, 307);
    const location = res.headers.get("location");
    assert.ok(location?.includes("/login"));
    assert.ok(location?.includes(`next=${encodeURIComponent(path)}`));
  }
});

test("proxy enforces rate limits on external market API routes", async () => {
  const testIp = "192.168.1.100";
  const path = "/api/quote";

  // Send 90 allowed requests
  for (let i = 0; i < 90; i++) {
    const req = new NextRequest(`https://example.com${path}`, {
      headers: { "x-forwarded-for": testIp },
    });
    const res = await proxy(req);
    assert.equal(res.status, 200, `Request ${i + 1} should succeed`);
  }

  // 91st request should be rate limited with 429
  const rateLimitedReq = new NextRequest(`https://example.com${path}`, {
    headers: { "x-forwarded-for": testIp },
  });
  const res = await proxy(rateLimitedReq);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "60");
  const data = await res.json();
  assert.equal(data.error, "Too many requests, slow down.");
});

test("proxy prunes stale rate limit buckets when map exceeds 10000 entries", async () => {
  // Fill 10,005 dummy IPs in unique paths to exceed map size 10,000
  for (let i = 0; i < 10005; i++) {
    const dummyReq = new NextRequest(`https://example.com/api/quote?id=${i}`, {
      headers: { "x-forwarded-for": `10.0.${Math.floor(i / 256)}.${i % 256}` },
    });
    await proxy(dummyReq);
  }

  const checkReq = new NextRequest("https://example.com/api/quote", {
    headers: { "x-forwarded-for": "10.0.0.1" },
  });
  const res = await proxy(checkReq);
  assert.equal(res.status, 200);
});

