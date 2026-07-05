import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deriveBillingState,
  FREE_BILLING_STATE,
} from "./billing-state.ts";

const USER = "user-123";
const PRICE = "price_pro";

function customerFor(userId = USER) {
  return { id: "cus_1", metadata: { supabase_user_id: userId } };
}

function proSub(overrides = {}) {
  return {
    id: "sub_1",
    status: "active",
    current_period_end: 1_800_000_000,
    items: { data: [{ price: { id: PRICE } }] },
    ...overrides,
  };
}

test("active pro subscription grants pro", () => {
  const state = deriveBillingState({
    customer: customerFor(),
    subscriptions: [proSub()],
    userId: USER,
    proPriceId: PRICE,
  });
  assert.equal(state.isPro, true);
  assert.equal(state.status, "active");
  assert.equal(state.subscriptionId, "sub_1");
  assert.equal(state.currentPeriodEnd, "2027-01-15T08:00:00.000Z");
});

test("trialing subscription grants pro with trialing status", () => {
  const state = deriveBillingState({
    customer: customerFor(),
    subscriptions: [proSub({ status: "trialing" })],
    userId: USER,
    proPriceId: PRICE,
  });
  assert.equal(state.isPro, true);
  assert.equal(state.status, "trialing");
});

test("canceled and unpaid subscriptions stay free", () => {
  for (const status of ["canceled", "unpaid", "past_due", "incomplete"]) {
    const state = deriveBillingState({
      customer: customerFor(),
      subscriptions: [proSub({ status })],
      userId: USER,
      proPriceId: PRICE,
    });
    assert.deepEqual(state, FREE_BILLING_STATE, status);
  }
});

test("subscription to a different price stays free", () => {
  const state = deriveBillingState({
    customer: customerFor(),
    subscriptions: [
      proSub({ items: { data: [{ price: { id: "price_other" } }] } }),
    ],
    userId: USER,
    proPriceId: PRICE,
  });
  assert.deepEqual(state, FREE_BILLING_STATE);
});

test("customer metadata mismatch is treated as free", () => {
  const state = deriveBillingState({
    customer: customerFor("someone-else"),
    subscriptions: [proSub()],
    userId: USER,
    proPriceId: PRICE,
  });
  assert.deepEqual(state, FREE_BILLING_STATE);
});

test("deleted or missing customer is free", () => {
  for (const customer of [null, { id: "cus_1", deleted: true }]) {
    const state = deriveBillingState({
      customer,
      subscriptions: [proSub()],
      userId: USER,
      proPriceId: PRICE,
    });
    assert.deepEqual(state, FREE_BILLING_STATE);
  }
});

test("period end falls back to subscription items on newer API shapes", () => {
  const state = deriveBillingState({
    customer: customerFor(),
    subscriptions: [
      proSub({
        current_period_end: undefined,
        items: {
          data: [
            { price: { id: PRICE }, current_period_end: 1_800_000_000 },
          ],
        },
      }),
    ],
    userId: USER,
    proPriceId: PRICE,
  });
  assert.equal(state.currentPeriodEnd, "2027-01-15T08:00:00.000Z");
});

test("latest expiring pro subscription wins", () => {
  const state = deriveBillingState({
    customer: customerFor(),
    subscriptions: [
      proSub({ id: "sub_old", current_period_end: 1_700_000_000 }),
      proSub({ id: "sub_new", current_period_end: 1_800_000_000 }),
    ],
    userId: USER,
    proPriceId: PRICE,
  });
  assert.equal(state.subscriptionId, "sub_new");
});

test("cancel at period end is surfaced", () => {
  const state = deriveBillingState({
    customer: customerFor(),
    subscriptions: [proSub({ cancel_at_period_end: true })],
    userId: USER,
    proPriceId: PRICE,
  });
  assert.equal(state.isPro, true);
  assert.equal(state.cancelAtPeriodEnd, true);
});
