# MarketCap Subscription Model: Free vs. Pro Tiers

This document maps out the proposed architecture for introducing a pricing model (Free vs. Pro) to the MarketCap application, including access control boundaries and Stripe payment integration.

---

## 1. Membership Tiers

### Free Tier
- **Access**:
  - Live stock search and basic detail pages.
  - 1 Watchlist (up to 5 stocks).
  - Standard technical indicator overlays (SMA 50, SMA 200).
  - Basic price alerts (up to 3 active alerts, database-only).
- **Limits**:
  - No AI Analyst chat.
  - No AI Portfolio Advisor reports.
  - No simulated paper trading cash balances.

### Pro Tier ($19/month)
- **Access**:
  - Unlimited Watchlists and unlimited stocks.
  - Advanced technical overlays (MACD, RSI, Bollinger Bands).
  - Multi-channel alerts (Discord/Slack Webhooks & Email notifications).
  - Full Gemini AI Analyst (Consensus Ratings, Pros/Cons, Chat Assistant).
  - Simulated Paper Trading Mode ($100k virtual cash accounts).
  - AI Portfolio Advisor allocation reviews and rebalancing suggestions.
  - Advanced Risk Diagnostics (stress testing, correlation matrices, DCF calculators).

---

## 2. Technical Roadmap & Stripe Integration

1. **Database Additions**:
   - Add a `subscriptions` table to Supabase:
     - `id` (UUID, primary key)
     - `user_id` (UUID, references auth.users)
     - `stripe_customer_id` (text, unique)
     - `stripe_subscription_id` (text, unique)
     - `tier` (text: 'FREE' or 'PRO')
     - `status` (text: 'active', 'canceled', etc.)
     - `current_period_end` (timestamptz)

2. **Access Control Middleware**:
   - Create a helper `lib/auth/subscription.ts` containing `getUserTier(userId: string)`.
   - In premium server actions and endpoints (e.g. `/api/portfolio/advisor`, `/api/stock/[symbol]/chat`), check the user tier and return a `403 Forbidden` response with a "Upgrade to Pro" message if they are on the Free tier.
   - On the client side, render locked cards with upgrade buttons for premium widgets.

3. **Stripe Webhook Integrations**:
   - Setup a Next.js endpoint `/api/webhooks/stripe` to handle events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Synchronize subscription status in Supabase.
