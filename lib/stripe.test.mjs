import assert from "node:assert/strict";
import { test } from "node:test";
import { getStripe, getOrCreateProPriceId } from "./stripe.ts";

test("getStripe initializes Stripe client and caches it", () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_123";

  try {
    const stripe = getStripe();
    assert.ok(stripe);
    // Verify that the same instance is returned on subsequent calls
    const stripe2 = getStripe();
    assert.equal(stripe, stripe2);
  } finally {
    process.env.STRIPE_SECRET_KEY = originalKey;
  }
});

test("getOrCreateProPriceId first looks up, creates price if missing, and caches it", async () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_123";

  try {
    const stripe = getStripe();

    let pricesListed = false;
    let productCreated = false;
    let priceCreated = false;

    // 1. Price is missing:
    stripe.prices.list = async (params) => {
      pricesListed = true;
      assert.deepEqual(params.lookup_keys, ["marketcap_pro_monthly"]);
      return { data: [] };
    };

    stripe.products.create = async (params) => {
      productCreated = true;
      assert.equal(params.name, "MarketCap Pro");
      return { id: "prod_mock_123" };
    };

    stripe.prices.create = async (params) => {
      priceCreated = true;
      assert.equal(params.product, "prod_mock_123");
      assert.equal(params.unit_amount, 2000);
      assert.equal(params.lookup_key, "marketcap_pro_monthly");
      return { id: "price_created_mock_123" };
    };

    const priceId = await getOrCreateProPriceId();
    assert.equal(priceId, "price_created_mock_123");
    assert.ok(pricesListed);
    assert.ok(productCreated);
    assert.ok(priceCreated);

    // 2. Cached check: subsequent call returns cached ID without invoking API again
    stripe.prices.list = async () => {
      throw new Error("Should not list prices again");
    };
    stripe.products.create = async () => {
      throw new Error("Should not create product again");
    };
    stripe.prices.create = async () => {
      throw new Error("Should not create price again");
    };

    const cachedPriceId = await getOrCreateProPriceId();
    assert.equal(cachedPriceId, "price_created_mock_123");

  } finally {
    process.env.STRIPE_SECRET_KEY = originalKey;
  }
});
