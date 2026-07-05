import "server-only";
import Stripe from "stripe";

export const PRO_PRICE_LOOKUP_KEY = "marketcap_pro_monthly";
export const PRO_PRICE_USD_CENTS = 2000;

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env.local");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

let cachedProPriceId: string | null = null;

/**
 * Finds the Pro price by lookup key, creating the product and price in the
 * connected Stripe account on first use. Safe to call repeatedly.
 */
export async function getOrCreateProPriceId(): Promise<string> {
  if (cachedProPriceId) return cachedProPriceId;

  const stripe = getStripe();
  const existing = await stripe.prices.list({
    lookup_keys: [PRO_PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) {
    cachedProPriceId = existing.data[0].id;
    return cachedProPriceId;
  }

  const product = await stripe.products.create({
    name: "MarketCap Pro",
    description: "Save stocks to your watchlist and unlock future Pro features.",
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: PRO_PRICE_USD_CENTS,
    currency: "usd",
    recurring: { interval: "month" },
    lookup_key: PRO_PRICE_LOOKUP_KEY,
  });
  cachedProPriceId = price.id;
  return cachedProPriceId;
}
