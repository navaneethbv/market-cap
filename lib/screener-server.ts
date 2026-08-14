import "server-only";
import { getQuote, getKeyMetrics, getProfile } from "./market/finnhub";
import { SCREENER_CATALOG, type ScreenerStock } from "./screener";

export async function fetchCatalogStocks(): Promise<ScreenerStock[]> {
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

  return settled
    .filter(
      (result): result is PromiseFulfilledResult<ScreenerStock> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);
}
