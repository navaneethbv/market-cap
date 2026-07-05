import Link from "next/link";
import { redirect } from "next/navigation";
import { PieChart, ShieldAlert } from "lucide-react";
import { PortfolioHistoryChart } from "@/components/portfolio-history-chart";
import { Button } from "@/components/ui/button";
import { getQuote, getKeyMetrics } from "@/lib/market/finnhub";
import {
  buildHoldingRows,
  calculatePortfolioSummary,
  type Holding,
} from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";
import { PortfolioTabs } from "@/components/portfolio-tabs";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio");
  }

  const { data: holdingsData, error: holdingsError } = await supabase
    .from("holdings")
    .select("id,symbol,shares,avg_cost,purchased_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (holdingsError) {
    throw new Error(holdingsError.message);
  }

  const realHoldings = (holdingsData ?? []).map((h) => ({
    ...h,
    shares: Number(h.shares),
    avg_cost: Number(h.avg_cost),
  })) as Holding[];

  const uniqueSymbols = Array.from(new Set(realHoldings.map((h) => h.symbol)));
  const quotesMap = new Map();
  const quoteResults = await Promise.allSettled(
    uniqueSymbols.map((sym) => getQuote(sym))
  );
  uniqueSymbols.forEach((sym, idx) => {
    const res = quoteResults[idx];
    if (res.status === "fulfilled") {
      quotesMap.set(sym, res.value);
    }
  });

  const realQuoteResults = realHoldings.map((h) => {
    const q = quotesMap.get(h.symbol);
    return q
      ? { status: "fulfilled" as const, value: q }
      : { status: "rejected" as const, reason: new Error("Quote unavailable") };
  });
  const realRows = buildHoldingRows(realHoldings, realQuoteResults);
  const realSummary = calculatePortfolioSummary(realRows);

  // Dividend income needs per-holding metrics (getKeyMetrics is cached 1h)
  const metricsMap = new Map();
  const metricsResults = await Promise.allSettled(
    realHoldings.map((h) => getKeyMetrics(h.symbol))
  );
  realHoldings.forEach((h, idx) => {
    const res = metricsResults[idx];
    if (res.status === "fulfilled") {
      metricsMap.set(h.symbol, res.value);
    }
  });

  const incomeMetrics = realHoldings.map((h) => {
    const quote = quotesMap.get(h.symbol);
    const metrics = metricsMap.get(h.symbol);
    return {
      symbol: h.symbol,
      shares: h.shares,
      price: quote ? quote.price : h.avg_cost,
      avgCost: h.avg_cost,
      dividendYield: metrics?.dividendYield ? Number(metrics.dividendYield) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Positions, performance, and estimated dividend income. Practice
            trading lives on the Trading page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/portfolio/risk">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Risk Diagnostics
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/portfolio/allocation">
              <PieChart className="h-4 w-4" />
              Allocation
            </Link>
          </Button>
        </div>
      </div>

      {realRows.length > 0 && <PortfolioHistoryChart />}

      <PortfolioTabs
        realRows={realRows}
        realSummary={realSummary}
        incomeMetrics={incomeMetrics}
      />
    </div>
  );
}
