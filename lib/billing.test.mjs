import assert from "node:assert/strict";
import { test } from "node:test";
import { getStripe } from "./stripe.ts";
import { getBillingState, invalidateBillingCache } from "./billing.ts";
import { FREE_BILLING_STATE } from "./billing-state.ts";

test("getBillingState retrieves billing state, caches it, and handles invalidation", async () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_123";

  try {
    const stripe = getStripe();
    const userId = "user_test_123";

    // Mock Stripe endpoints:
    stripe.customers.retrieve = async (id) => {
      assert.equal(id, "cus_test_123");
      return { id: "cus_test_123", metadata: { supabase_user_id: userId } };
    };

    stripe.subscriptions.list = async (params) => {
      assert.equal(params.customer, "cus_test_123");
      return {
        data: [
          {
            id: "sub_test_123",
            status: "active",
            current_period_end: 1800000000,
            items: { data: [{ price: { id: "price_pro_123" } }] },
          },
        ],
      };
    };

    // Mock pricing lookup
    stripe.prices.list = async () => {
      return { data: [{ id: "price_pro_123" }] };
    };

    // Mock Supabase client:
    let dbQueries = 0;
    const mockSupabase = {
      from: (table) => {
        assert.equal(table, "stripe_customers");
        return {
          select: (columns) => {
            assert.equal(columns, "stripe_customer_id");
            return {
              eq: (field, val) => {
                assert.equal(field, "user_id");
                assert.equal(val, userId);
                return {
                  maybeSingle: async () => {
                    dbQueries++;
                    return { data: { stripe_customer_id: "cus_test_123" } };
                  },
                };
              },
            };
          },
        };
      },
    };

    // 1. Initial lookup (cache miss):
    const state = await getBillingState(userId, mockSupabase);
    assert.equal(state.isPro, true);
    assert.equal(state.subscriptionId, "sub_test_123");
    assert.equal(dbQueries, 1);

    // 2. Subsequent lookup (cache hit):
    const cachedState = await getBillingState(userId, mockSupabase);
    assert.equal(cachedState.isPro, true);
    assert.equal(dbQueries, 1); // should still be 1 (no new database queries)

    // 3. Cache invalidation:
    invalidateBillingCache(userId);
    const postInvalidateState = await getBillingState(userId, mockSupabase);
    assert.equal(postInvalidateState.isPro, true);
    assert.equal(dbQueries, 2); // should now be 2 (database queried again)

  } finally {
    process.env.STRIPE_SECRET_KEY = originalKey;
  }
});

test("getBillingState returns FREE_BILLING_STATE on Supabase/Stripe error", async () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_123";

  try {
    const userId = "user_test_456";
    const errorSupabase = {
      from: () => {
        throw new Error("Simulated database failure");
      },
    };

    // Evict any existing cache for this test user
    invalidateBillingCache(userId);

    const state = await getBillingState(userId, errorSupabase);
    assert.deepEqual(state, FREE_BILLING_STATE);
  } finally {
    process.env.STRIPE_SECRET_KEY = originalKey;
  }
});

test("getBillingState returns FREE_BILLING_STATE when user has no stripe customer mapping", async () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_123";

  try {
    const userId = "user_test_789";
    const emptySupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              return { data: null, error: null };
            },
          }),
        }),
      }),
    };

    invalidateBillingCache(userId);

    const state = await getBillingState(userId, emptySupabase);
    assert.deepEqual(state, FREE_BILLING_STATE);
  } finally {
    process.env.STRIPE_SECRET_KEY = originalKey;
  }
});

test("getBillingState returns FREE_BILLING_STATE when database returns a query error object", async () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_123";

  try {
    const userId = "user_test_999";
    const failureSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              return { data: null, error: { message: "Supabase PG error" } };
            },
          }),
        }),
      }),
    };

    invalidateBillingCache(userId);

    const state = await getBillingState(userId, failureSupabase);
    assert.deepEqual(state, FREE_BILLING_STATE);
  } finally {
    process.env.STRIPE_SECRET_KEY = originalKey;
  }
});
