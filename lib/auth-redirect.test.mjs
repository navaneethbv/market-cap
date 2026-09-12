import assert from "node:assert/strict";
import { test } from "node:test";
import { getSafeAuthRedirect } from "./auth-redirect.ts";

test("post-auth navigation preserves local paths, queries, and anchors", () => {
  for (const value of ["/", "/portfolio?tab=income#dividends", "/stock/BRK.B", "/compare?symbols=AAPL%2CMSFT"]) {
    assert.equal(getSafeAuthRedirect(value), value);
  }
});

test("post-auth navigation cannot escape through browser URL normalization", () => {
  for (const value of [null, "", "https://example.com", "//example.com", "/\\example.com", "/\t/example.com", "/\n/example.com", "/\r/example.com", "/a/..//example.com", "javascript:alert(1)", " /portfolio"]) {
    assert.equal(getSafeAuthRedirect(value), "/", JSON.stringify(value));
    assert.equal(new URL(getSafeAuthRedirect(value), "https://market.example/auth/confirm").origin, "https://market.example");
  }
});
