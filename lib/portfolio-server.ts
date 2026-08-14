import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQuote, getKeyMetrics } from "@/lib/market/finnhub";
import { enrichHoldingsMarketData, type EnrichedHoldingData } from "@/lib/portfolio";

export async function fetchUserPortfolioMarketData(
  nextPath: string,
  includeMetrics = false
): Promise<EnrichedHoldingData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
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

  if (includeMetrics) {
    const [quoteResults, metricsResults] = await Promise.all([
      Promise.allSettled(uniqueSymbols.map((sym) => getQuote(sym))),
      Promise.allSettled(uniqueSymbols.map((sym) => getKeyMetrics(sym))),
    ]);
    return enrichHoldingsMarketData(rawHoldings, quoteResults, metricsResults, uniqueSymbols);
  }

  const quoteResults = await Promise.allSettled(
    uniqueSymbols.map((sym) => getQuote(sym))
  );
  return enrichHoldingsMarketData(rawHoldings, quoteResults, undefined, uniqueSymbols);
}
