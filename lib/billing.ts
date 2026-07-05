import "server-only";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import {
  deriveBillingState,
  FREE_BILLING_STATE,
  type BillingState,
} from "@/lib/billing-state";
import { getOrCreateProPriceId, getStripe } from "@/lib/stripe";

const CACHE_TTL_MS = 60_000;
// Short TTL after a Stripe failure so an outage neither hammers the API nor
// pins users to a stale answer for a full minute
const ERROR_TTL_MS = 5_000;

const cache = new Map<string, { state: BillingState; expires: number }>();

export function invalidateBillingCache(userId: string) {
  cache.delete(userId);
}

/**
 * The app's single entitlement check. Stripe is the source of truth; the
 * database only stores the user -> customer id mapping. On any Stripe
 * failure the user is treated as free (deny by default), never Pro.
 */
export async function getBillingState(userId: string): Promise<BillingState> {
  const hit = cache.get(userId);
  if (hit && hit.expires > Date.now()) {
    return hit.state;
  }

  let state = FREE_BILLING_STATE;
  let ttl = CACHE_TTL_MS;
  try {
    state = await fetchBillingState(userId);
  } catch (err) {
    console.error("billing state lookup failed:", err);
    ttl = ERROR_TTL_MS;
  }

  cache.set(userId, { state, expires: Date.now() + ttl });
  return state;
}

async function fetchBillingState(userId: string): Promise<BillingState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return FREE_BILLING_STATE;
  }

  const stripe = getStripe();
  const proPriceId = await getOrCreateProPriceId();
  const [customer, subscriptions] = await Promise.all([
    stripe.customers.retrieve(data.stripe_customer_id) as Promise<
      Stripe.Customer | Stripe.DeletedCustomer
    >,
    stripe.subscriptions.list({
      customer: data.stripe_customer_id,
      status: "all",
      limit: 10,
    }),
  ]);

  return deriveBillingState({
    // Stripe's Customer/DeletedCustomer union does not line up with the
    // plain CustomerLike shape, so adapt it explicitly
    customer: {
      id: customer.id,
      deleted: customer.deleted === true,
      metadata:
        "metadata" in customer
          ? (customer.metadata as Record<string, string>)
          : undefined,
    },
    subscriptions: subscriptions.data,
    userId,
    proPriceId,
  });
}
