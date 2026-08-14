import { redirect } from "next/navigation";
import { DollarSign } from "lucide-react";
import { getQuote, getKeyMetrics } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";
import { DividendCalendar } from "@/components/dividend-calendar";

export const metadata = {
  title: "Dividend Income Calendar & Forecaster - MarketCap",
  description: "12-month projected dividend cash flows, quarterly payout distribution, and Yield on Cost analytics.",
};

export default async function PortfolioIncomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio/income");
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

  const [quoteResults, metricsResults] = await Promise.all([
    Promise.allSettled(uniqueSymbols.map((sym) => getQuote(sym))),
    Promise.allSettled(uniqueSymbols.map((sym) => getKeyMetrics(sym))),
  ]);

  const quotesMap = new Map<string, number>();
  const metricsMap = new Map<string, number | null>();

  uniqueSymbols.forEach((sym, idx) => {
    const qRes = quoteResults[idx];
    if (qRes.status === "fulfilled") {
      quotesMap.set(sym, qRes.value.price);
    }
    const mRes = metricsResults[idx];
    if (mRes.status === "fulfilled") {
      metricsMap.set(sym, mRes.value.dividendYield);
    }
  });

  const holdingForecastInputs = rawHoldings.map((h) => ({
    symbol: h.symbol,
    shares: Number(h.shares),
    avgCost: Number(h.avg_cost),
    price: quotesMap.get(h.symbol) ?? Number(h.avg_cost),
    dividendYield: metricsMap.get(h.symbol) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <DollarSign className="h-4 w-4" />
            Passive Income
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Dividend Income Calendar & Forecaster
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">
            Projected 12-month passive dividend cash flows from your portfolio holdings.
            Track estimated quarterly payout schedules, monthly income averages, and aggregate Yield on Cost (YOC).
          </p>
        </div>
      </section>

      <DividendCalendar holdings={holdingForecastInputs} />
    </div>
  );
}
