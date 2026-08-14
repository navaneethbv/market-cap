import { redirect } from "next/navigation";
import { Coins } from "lucide-react";
import { getQuote } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";
import { buildHoldingRows, type Holding } from "@/lib/portfolio";
import { TaxLossAssistant } from "@/components/tax-loss-assistant";

export const metadata = {
  title: "Tax-Loss Harvesting Assistant - MarketCap",
  description: "Identify unrealized capital loss holdings, estimate tax savings, and find wash-sale-safe ETF replacements.",
};

export default async function TaxLossHarvestingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio/tax-loss");
  }

  const { data: holdingsData, error: holdingsError } = await supabase
    .from("holdings")
    .select("id,symbol,shares,avg_cost,purchased_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (holdingsError) {
    throw new Error(holdingsError.message);
  }

  const holdings: Holding[] = (holdingsData ?? []).map((h) => ({
    id: h.id,
    symbol: h.symbol,
    shares: Number(h.shares),
    avg_cost: Number(h.avg_cost),
    purchased_at: h.purchased_at,
    created_at: h.created_at,
  }));

  const quoteResults = await Promise.allSettled(
    holdings.map((h) => getQuote(h.symbol))
  );

  const rows = buildHoldingRows(holdings, quoteResults);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <Coins className="h-4 w-4" />
            Tax Optimization
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tax-Loss Harvesting Assistant
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">
            Identify holdings with unrealized capital losses to offset taxable capital gains.
            Review estimated tax savings and non-substantially identical ETF substitutes to avoid IRS 30-day Wash Sale rule pitfalls.
          </p>
        </div>
      </section>

      <TaxLossAssistant holdings={rows} />
    </div>
  );
}
