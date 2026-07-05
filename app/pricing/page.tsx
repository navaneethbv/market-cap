import Link from "next/link";
import { Check, Crown, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getBillingState } from "@/lib/billing";
import { FREE_BILLING_STATE } from "@/lib/billing-state";
import { startProCheckout } from "./actions";

export const metadata = {
  title: "Pricing - MarketCap",
};

const FREE_FEATURES = [
  "Live quotes, charts, and company news",
  "Stock screener, movers, and comparisons",
  "Paper trading with a $100k practice account",
  "Portfolio tracking and price alerts",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Save stocks to your watchlist",
  "Watchlist on the dashboard with live prices",
  "Priority access to future Pro features",
];

type PricingPageProps = {
  searchParams: Promise<{ reason?: string; already?: string }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const billing = user ? await getBillingState(user.id) : FREE_BILLING_STATE;

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Simple pricing
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Start free. Upgrade to Pro when you want MarketCap to remember the
          stocks you care about.
        </p>
      </div>

      {params.reason === "watchlist" && (
        <div className="rounded-2xl border border-primary/30 bg-accent p-4 text-center text-sm text-accent-foreground">
          Saving stocks to your watchlist is a Pro feature. Upgrade below to
          unlock it.
        </div>
      )}
      {params.already === "pro" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-700 dark:text-emerald-400">
          You are already on Pro. Nothing to pay again.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Free plan */}
        <div className="flex flex-col rounded-3xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Free</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore the market with live data.
          </p>
          <p className="mt-5 text-4xl font-bold tabular-nums">
            $0
            <span className="text-sm font-medium text-muted-foreground">
              /month
            </span>
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            {user ? (
              <Button variant="outline" className="w-full rounded-full" disabled>
                {billing.isPro ? "Included in Pro" : "Current plan"}
              </Button>
            ) : (
              <Button variant="outline" className="w-full rounded-full" asChild>
                <Link href="/signup">Sign up free</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Pro plan */}
        <div className="relative flex flex-col rounded-3xl border-2 border-primary bg-card p-6 shadow-sm">
          <Badge className="absolute -top-3 left-6 rounded-full">
            Most popular
          </Badge>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Pro</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your watchlist, saved and synced.
          </p>
          <p className="mt-5 text-4xl font-bold tabular-nums">
            $20
            <span className="text-sm font-medium text-muted-foreground">
              /month
            </span>
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            {billing.isPro ? (
              <div className="space-y-2">
                <Button className="w-full rounded-full" disabled>
                  <Star className="h-4 w-4" />
                  You are on Pro
                </Button>
                {billing.currentPeriodEnd && (
                  <p className="text-center text-xs text-muted-foreground">
                    {billing.cancelAtPeriodEnd ? "Ends" : "Renews"} on{" "}
                    {new Date(billing.currentPeriodEnd).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
                  </p>
                )}
              </div>
            ) : user ? (
              <form action={startProCheckout}>
                <Button type="submit" className="w-full rounded-full">
                  Upgrade to Pro
                </Button>
              </form>
            ) : (
              <Button className="w-full rounded-full" asChild>
                <Link href="/login?next=%2Fpricing">Log in to upgrade</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Payments are processed by Stripe. This project runs in sandbox mode:
        use test card 4242 4242 4242 4242 with any future expiry and any CVC.
        See docs/PAYMENTS.md for details.
      </p>
    </div>
  );
}
