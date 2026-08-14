import Link from "next/link";
import { redirect } from "next/navigation";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuote } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";
import { enrichHoldingsMarketData } from "@/lib/portfolio";
import { RebalanceCalculator } from "@/components/rebalance-calculator";
import type { RebalanceInputHolding } from "@/lib/rebalancer";

export default async function PortfolioRebalancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio/rebalance");
  }

  const { data: holdingsData, error: holdingsError } = await supabase
    .from("holdings")
    .select("symbol,shares,avg_cost")
    .eq("user_id", user.id);

  if (holdingsError) {
    throw new Error(holdingsError.message);
  }

  const rawHoldings = holdingsData ?? [];
  const uniqueSymbols = Array.from(new Set(rawHoldings.map((h) => h.symbol)));
  const quoteResults = await Promise.allSettled(
    uniqueSymbols.map((sym) => getQuote(sym))
  );

  const enriched = enrichHoldingsMarketData(rawHoldings, quoteResults, undefined, uniqueSymbols);
  const rebalanceHoldings: RebalanceInputHolding[] = enriched.map((h) => ({
    symbol: h.symbol,
    shares: h.shares,
    price: h.price,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Scale className="h-4 w-4" />
              <span>Portfolio Tools</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Portfolio Rebalancer
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Calculate exact buy and sell orders needed to achieve your target asset allocation.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <Link href="/portfolio">Back to Portfolio</Link>
          </Button>
        </div>
      </section>

      <RebalanceCalculator holdings={rebalanceHoldings} />
    </div>
  );
}
