import Link from "next/link";
import { redirect } from "next/navigation";
import { PieChart, Sparkles, ShieldAlert, Trophy } from "lucide-react";
import { PortfolioHistoryChart } from "@/components/portfolio-history-chart";
import { Button } from "@/components/ui/button";
import { getQuote, getKeyMetrics } from "@/lib/market/finnhub";
import {
  buildHoldingRows,
  calculatePortfolioSummary,
  type Holding,
} from "@/lib/portfolio";
import {
  buildPaperHoldingRows,
  calculatePaperPortfolioSummary,
} from "@/lib/paper-portfolio";
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

  // 1. Fetch Real holdings
  const { data: holdingsData, error: holdingsError } = await supabase
    .from("holdings")
    .select("id,symbol,shares,avg_cost,purchased_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (holdingsError) {
    throw new Error(holdingsError.message);
  }

  // 2. Fetch Paper portfolio cash
  const { data: paperPortfolio, error: paperPortfolioError } = await supabase
    .from("paper_portfolios")
    .select("cash_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (paperPortfolioError) {
    throw new Error(paperPortfolioError.message);
  }
  const paperCash = paperPortfolio ? Number(paperPortfolio.cash_balance) : 100000.00;

  // 3. Fetch Paper holdings
  const { data: paperHoldingsData, error: paperHoldingsError } = await supabase
    .from("paper_holdings")
    .select("id,symbol,shares,avg_cost,purchased_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (paperHoldingsError) {
    throw new Error(paperHoldingsError.message);
  }

  // 4. Fetch Paper transactions
  const { data: paperTransactionsData, error: paperTransactionsError } = await supabase
    .from("paper_transactions")
    .select("id,symbol,type,shares,price,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (paperTransactionsError) {
    throw new Error(paperTransactionsError.message);
  }

  const realHoldings = (holdingsData ?? []).map((h) => ({
    ...h,
    shares: Number(h.shares),
    avg_cost: Number(h.avg_cost),
  })) as Holding[];

  const paperHoldings = (paperHoldingsData ?? []).map((h) => ({
    ...h,
    shares: Number(h.shares),
    avg_cost: Number(h.avg_cost),
  }));

  // Gather all unique symbols to batch fetch quotes
  const uniqueSymbols = Array.from(
    new Set([
      ...realHoldings.map((h) => h.symbol),
      ...paperHoldings.map((h) => h.symbol),
    ])
  );

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

  // Calculate Real Portfolio summary rows
  const realQuoteResults = realHoldings.map((h) => {
    const q = quotesMap.get(h.symbol);
    return q
      ? { status: "fulfilled" as const, value: q }
      : { status: "rejected" as const, reason: new Error("Quote unavailable") };
  });
  const realRows = buildHoldingRows(realHoldings, realQuoteResults);
  const realSummary = calculatePortfolioSummary(realRows);

  // Calculate Paper Portfolio summary rows
  const paperQuoteResults = paperHoldings.map((h) => {
    const q = quotesMap.get(h.symbol);
    return q
      ? { status: "fulfilled" as const, value: q }
      : { status: "rejected" as const, reason: new Error("Quote unavailable") };
  });
  const paperRows = buildPaperHoldingRows(paperHoldings, paperQuoteResults);
  const paperSummary = calculatePaperPortfolioSummary(paperRows, paperCash);

  // 5. Fetch Key Metrics for Dividends
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

  const paperTransactions = (paperTransactionsData ?? []).map((t) => ({
    id: t.id,
    symbol: t.symbol,
    type: t.type as "BUY" | "SELL",
    shares: Number(t.shares),
    price: Number(t.price),
    created_at: t.created_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Positions, simulated trading, and estimated dividend cash flows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/portfolio/advisor">
              <Sparkles className="h-4 w-4 fill-current text-primary" />
              AI Advisor
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/portfolio/leaderboard">
              <Trophy className="h-4 w-4 text-primary" />
              Leaderboard
            </Link>
          </Button>
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
        paperRows={paperRows}
        paperSummary={paperSummary}
        paperTransactions={paperTransactions}
        incomeMetrics={incomeMetrics}
      />
    </div>
  );
}
