import { NextResponse } from "next/server";
import { getQuote, getKeyMetrics, getProfile } from "@/lib/market/finnhub";
import { SCREENER_CATALOG, type ScreenerStock } from "@/lib/screener";

export async function GET() {
  const settled = await Promise.allSettled(
    SCREENER_CATALOG.map(async (cat): Promise<ScreenerStock> => {
      const [quote, metrics, profile] = await Promise.all([
        getQuote(cat.symbol),
        getKeyMetrics(cat.symbol),
        getProfile(cat.symbol),
      ]);

      return {
        symbol: cat.symbol,
        name: cat.name,
        sector: cat.sector,
        marketCap: profile.marketCap ? Math.round(profile.marketCap / 1000) : 0,
        peRatio: metrics.peRatio,
        dividendYield: metrics.dividendYield,
        beta: metrics.beta,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
      };
    })
  );

  // Omit symbols we could not price rather than serving stale placeholder data
  const stocks = settled
    .filter(
      (result): result is PromiseFulfilledResult<ScreenerStock> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);

  return NextResponse.json({ stocks, total: SCREENER_CATALOG.length });
}
