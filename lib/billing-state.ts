// Pure billing derivation, kept free of server-only imports so the node
// --test runner can exercise it directly

export interface BillingState {
  isPro: boolean;
  status: "active" | "trialing" | "none";
  subscriptionId: string | null;
  currentPeriodEnd: string | null; // ISO datetime
  cancelAtPeriodEnd: boolean;
}

export const FREE_BILLING_STATE: BillingState = {
  isPro: false,
  status: "none",
  subscriptionId: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

export interface CustomerLike {
  id: string;
  deleted?: boolean;
  metadata?: Record<string, string>;
}

export interface SubscriptionLike {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
  // Present on older Stripe API versions
  current_period_end?: number | null;
  items?: {
    data?: {
      // Present on newer (2025+) Stripe API versions
      current_period_end?: number | null;
      price?: { id?: string };
    }[];
  };
}

const PRO_STATUSES = new Set(["active", "trialing"]);

function subscriptionPeriodEnd(sub: SubscriptionLike): number | null {
  if (typeof sub.current_period_end === "number") {
    return sub.current_period_end;
  }
  const itemEnds = (sub.items?.data ?? [])
    .map((item) => item.current_period_end)
    .filter((end): end is number => typeof end === "number");
  return itemEnds.length > 0 ? Math.max(...itemEnds) : null;
}

function subscriptionHasPrice(sub: SubscriptionLike, priceId: string): boolean {
  return (sub.items?.data ?? []).some((item) => item.price?.id === priceId);
}

/**
 * Derives the app's billing state from Stripe records. The customer's
 * metadata must name the same Supabase user; otherwise the customer is
 * treated as not ours and the user stays on the free plan. That check is
 * what stops a user from pointing their stripe_customers row at someone
 * else's paying customer id.
 */
export function deriveBillingState(input: {
  customer: CustomerLike | null;
  subscriptions: SubscriptionLike[];
  userId: string;
  proPriceId: string;
}): BillingState {
  const { customer, subscriptions, userId, proPriceId } = input;

  if (
    !customer ||
    customer.deleted === true ||
    customer.metadata?.supabase_user_id !== userId
  ) {
    return FREE_BILLING_STATE;
  }

  const proSubs = subscriptions.filter(
    (sub) =>
      PRO_STATUSES.has(sub.status) && subscriptionHasPrice(sub, proPriceId)
  );
  if (proSubs.length === 0) {
    return FREE_BILLING_STATE;
  }

  const best = proSubs.reduce((a, b) =>
    (subscriptionPeriodEnd(b) ?? 0) > (subscriptionPeriodEnd(a) ?? 0) ? b : a
  );
  const periodEnd = subscriptionPeriodEnd(best);

  return {
    isPro: true,
    status: best.status === "trialing" ? "trialing" : "active",
    subscriptionId: best.id,
    currentPeriodEnd:
      periodEnd !== null ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: best.cancel_at_period_end === true,
  };
}
