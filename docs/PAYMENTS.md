# Payments: Stripe subscriptions

MarketCap has two plans:

| Plan | Price | What it adds |
|---|---|---|
| Free | $0 | Quotes, charts, news, screener, movers, compare, calendar, alerts, portfolio, paper trading |
| Pro | $20/month (recurring) | Saving stocks to your watchlist (and future Pro features) |

Saving to the watchlist is the gated action: free users can browse
everything, but pressing Watch redirects them to `/pricing?reason=watchlist`.
Removing an already-saved stock is always allowed, so a lapsed subscriber is
never locked out of cleaning up their data.

## Architecture

Stripe is the single source of truth for entitlement. There is no `is_pro`
column anywhere; a user cannot grant themselves Pro by writing to the
database.

- `stripe_customers` (Supabase): maps `user_id` to `stripe_customer_id`.
  RLS-protected; users can only read/write their own row. This mapping is
  the only billing data stored in the database.
- `lib/stripe.ts`: Stripe client. `getOrCreateProPriceId()` finds the Pro
  price by lookup key `marketcap_pro_monthly` and creates the product
  ("MarketCap Pro") and $20/month price in your Stripe account on first
  use, so there is no manual dashboard setup.
- `lib/billing.ts` `getBillingState(userId)`: the single entitlement check.
  Reads the customer mapping, retrieves the customer from Stripe, verifies
  `customer.metadata.supabase_user_id` matches the user (so pointing your
  row at someone else's customer id does nothing), then looks for an
  active or trialing subscription on the Pro price. Results are cached
  in-memory for 60 seconds; on any Stripe failure the user is treated as
  Free (deny by default).
- `lib/billing-state.ts`: the pure derivation logic, unit-tested in
  `lib/billing-state.test.mjs`.
- `app/pricing/page.tsx`: the pricing page. `app/pricing/actions.ts`
  creates the Stripe customer (with `supabase_user_id` metadata) and a
  subscription-mode Checkout Session, then redirects to Stripe's hosted
  checkout.
- `app/pricing/success/page.tsx`: Stripe redirects here with
  `?session_id=...`. The server retrieves the session, verifies it belongs
  to the logged-in user (`client_reference_id`) and is paid, and busts the
  billing cache so Pro applies immediately.
- Gate: `toggleWatchlistItem` in `app/watchlist/actions.ts` checks
  `getBillingState` before inserts.

## Environment variables

In `.env.local` (gitignored):

```
STRIPE_SECRET_KEY=sk_test_...            # required, server-only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # reserved for future embedded elements
APP_URL=http://localhost:3000            # trusted app origin for Checkout redirects
```

Sandbox keys come from https://dashboard.stripe.com/test/apikeys. With
`sk_test_` keys everything runs in Stripe's test mode; no real money moves.
If `APP_URL` is not set, Vercel deployment URL env vars are used when
available, then localhost is used as the development fallback.

## Testing the flow in sandbox mode

1. `npm run dev`, log in (or sign up).
2. Open `/pricing` (also in the sidebar under Pricing) and click
   "Upgrade to Pro". You land on Stripe's hosted checkout.
3. Pay with the standard test card:
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date. CVC: any 3 digits. Name/address: anything.
4. You are redirected to `/pricing/success`, which verifies the session
   and confirms Pro.
5. Open any stock and press Watch: the save now succeeds. Before paying,
   the same press redirects to `/pricing?reason=watchlist`.

Other useful test cards: `4000 0000 0000 0002` (declined),
`4000 0025 0000 3155` (requires 3D Secure). Subscriptions can be inspected
and canceled at https://dashboard.stripe.com/test/subscriptions.

## Production notes (not built yet, by design)

This is a sandbox-grade integration meant for testing. Before going live:

- Add a Stripe webhook (`checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`) that
  writes subscription status to a table only the service role can write,
  and prefer that over live API lookups. Requires `STRIPE_WEBHOOK_SECRET`
  and `SUPABASE_SERVICE_ROLE_KEY` env vars.
- Add a Stripe Billing customer portal link so users can cancel or change
  cards themselves (`stripe.billingPortal.sessions.create`).
- Swap `sk_test_` for live keys in the deployment environment only.
- The in-memory billing cache is per server instance; behind multiple
  instances, add a shared cache or rely on the webhook-written table.
