import { getQuote, getKeyMetrics, getProfile } from "@/lib/market/finnhub";
import { SCREENER_CATALOG, type ScreenerStock } from "@/lib/screener";
import { MarketHeatmap } from "@/components/market-heatmap";
import { LayoutGrid } from "lucide-react";

export const metadata = {
  title: "Market Sector Heatmap - MarketCap",
  description: "Live visual treemap and heatmap of US market equities by sector and performance.",
};

export default async function HeatmapPage() {
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

  const stocks = settled
    .filter(
      (result): result is PromiseFulfilledResult<ScreenerStock> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <LayoutGrid className="h-4 w-4" />
            Market Visualization
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sector Performance Heatmap
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground">
            Live treemap of US equity market leaders grouped by industry sector.
            Tiles are sized by market capitalization and colored by daily percentage gain/loss.
          </p>
        </div>
      </section>

      <MarketHeatmap stocks={stocks} />
    </div>
  );
}
