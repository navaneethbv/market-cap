import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getAppOrigin } from "./app-url.ts";

const ORIGINAL_ENV = {
  APP_URL: process.env.APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test("getAppOrigin prefers configured app urls over request origin", () => {
  process.env.APP_URL = "https://marketcap.example.com/";

  assert.equal(
    getAppOrigin("https://attacker.example"),
    "https://marketcap.example.com"
  );
});

test("getAppOrigin derives Vercel deployment urls when no app url is configured", () => {
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  process.env.VERCEL_URL = "market-cap-git-main.vercel.app";

  assert.equal(
    getAppOrigin("https://attacker.example"),
    "https://market-cap-git-main.vercel.app"
  );
});

test("getAppOrigin only trusts localhost request origins as a fallback", () => {
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.VERCEL_URL;

  assert.equal(getAppOrigin("http://localhost:3100"), "http://localhost:3100");
  assert.equal(getAppOrigin("https://attacker.example"), "http://localhost:3000");
});
