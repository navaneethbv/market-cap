import type { ScreenerStock } from "./screener";

export interface HeatmapStockNode {
  symbol: string;
  name: string;
  marketCap: number;
  price: number;
  changePercent: number;
  color: string;
}

export interface HeatmapSectorGroup {
  sector: string;
  totalMarketCap: number;
  weightedChangePercent: number;
  stocks: HeatmapStockNode[];
}

export function getHeatmapColor(changePercent: number): string {
  if (changePercent >= 3.0) return "rgb(16, 185, 129)"; // emerald-500
  if (changePercent >= 1.5) return "rgb(34, 197, 94)";  // green-500
  if (changePercent >= 0.5) return "rgb(74, 222, 128)"; // green-400
  if (changePercent > -0.5) return "rgb(100, 116, 139)"; // slate-500
  if (changePercent > -1.5) return "rgb(248, 113, 113)"; // red-400
  if (changePercent > -3.0) return "rgb(239, 68, 68)";   // red-500
  return "rgb(220, 38, 38)";                            // red-600
}

export function buildSectorHeatmapData(
  stocks: readonly ScreenerStock[]
): HeatmapSectorGroup[] {
  const groups: Record<string, ScreenerStock[]> = {};

  for (const s of stocks) {
    if (!groups[s.sector]) {
      groups[s.sector] = [];
    }
    groups[s.sector].push(s);
  }

  const result: HeatmapSectorGroup[] = [];

  for (const [sector, sectorStocks] of Object.entries(groups)) {
    const totalMarketCap = sectorStocks.reduce((acc, s) => acc + s.marketCap, 0);

    let weightedSum = 0;
    if (totalMarketCap > 0) {
      for (const s of sectorStocks) {
        weightedSum += s.changePercent * (s.marketCap / totalMarketCap);
      }
    }

    const sortedStocks = [...sectorStocks]
      .sort((a, b) => b.marketCap - a.marketCap)
      .map((s) => ({
        symbol: s.symbol,
        name: s.name,
        marketCap: s.marketCap,
        price: s.price,
        changePercent: s.changePercent,
        color: getHeatmapColor(s.changePercent),
      }));

    result.push({
      sector,
      totalMarketCap: Number(totalMarketCap.toFixed(2)),
      weightedChangePercent: Number(weightedSum.toFixed(2)),
      stocks: sortedStocks,
    });
  }

  return result.sort((a, b) => b.totalMarketCap - a.totalMarketCap);
}
