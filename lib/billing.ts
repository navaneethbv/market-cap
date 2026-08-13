import "server-only";
import type Stripe from "stripe";
import {
  deriveBillingState,
  FREE_BILLING_STATE,
  type BillingState,
} from "./billing-state.ts";
import { getOrCreateProPriceId, getStripe } from "./stripe.ts";

// Billing state is read from Stripe on every check so cancellation and
// payment-status changes are not hidden by a process-local cache.
export function invalidateBillingCache() {
  // Intentional no-op: the Stripe-backed check above is always authoritative.
}

/**
 * The app's single entitlement check. Stripe is the source of truth; the
 * database only stores the user -> customer id mapping. On any Stripe
 * failure the user is treated as free (deny by default), never Pro.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBillingState(userId: string, supabaseClient?: any): Promise<BillingState> {
  try {
    return await fetchBillingState(userId, supabaseClient);
  } catch (err) {
    console.error("billing state lookup failed:", err);
    return FREE_BILLING_STATE;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchBillingState(userId: string, supabaseClient?: any): Promise<BillingState> {
  const supabase = supabaseClient ?? (await (await import("./supabase/server.ts")).createClient());
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
