import type { Candle } from "./market/types";
import type { Holding } from "./portfolio";

export interface PortfolioHistoryPoint {
  time: string;
  value: number;
  costBasis: number;
  profitLoss: number;
  profitLossPercent: number;
}

function buildPriceMap(candlesMap: Record<string, Candle[]>): Record<string, Map<string, number>> {
  const priceMap: Record<string, Map<string, number>> = {};
  for (const symbol in candlesMap) {
    priceMap[symbol] = new Map();
    for (const candle of candlesMap[symbol]) {
      priceMap[symbol].set(candle.time, candle.close);
    }
  }
  return priceMap;
}

function getPriceOnOrBefore(
  symbol: string,
  time: string,
  priceMap: Record<string, Map<string, number>>,
  candlesMap: Record<string, Candle[]>
): number | null {
  const directPrice = priceMap[symbol]?.get(time);
  if (directPrice !== undefined) return directPrice;

  const symbolCandles = candlesMap[symbol] ?? [];
  const targetTime = new Date(time).getTime();

  let lastKnownPrice: number | null = null;
  for (const candle of symbolCandles) {
    const candleTime = new Date(candle.time).getTime();
    if (candleTime <= targetTime) {
      lastKnownPrice = candle.close;
    } else {
      break;
    }
  }
  return lastKnownPrice;
}

function getSortedCandleTimes(candlesMap: Record<string, Candle[]>): string[] {
  const allTimes = new Set<string>();
  for (const symbol in candlesMap) {
    for (const candle of candlesMap[symbol]) {
      allTimes.add(candle.time);
    }
  }

  return Array.from(allTimes).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
}

function buildHistoryPoint(
  time: string,
  holdings: Holding[],
  priceMap: Record<string, Map<string, number>>,
  candlesMap: Record<string, Candle[]>
): PortfolioHistoryPoint {
  let totalValue = 0;
  let totalCost = 0;
  const candleDate = time.slice(0, 10);

  for (const holding of holdings) {
    if (holding.purchased_at > candleDate) continue;

    const price = getPriceOnOrBefore(holding.symbol, time, priceMap, candlesMap);
    if (price === null) continue;

    totalValue += holding.shares * price;
    totalCost += holding.shares * holding.avg_cost;
  }

  const profitLoss = totalValue - totalCost;
  const profitLossPercent = totalCost === 0 ? 0 : (profitLoss / totalCost) * 100;

  return {
    time,
    value: totalValue,
    costBasis: totalCost,
    profitLoss,
    profitLossPercent,
  };
}

export function calculatePortfolioHistory(
  holdings: Holding[],
  candlesMap: Record<string, Candle[]>
): PortfolioHistoryPoint[] {
  if (holdings.length === 0) return [];

  const sortedTimes = getSortedCandleTimes(candlesMap);
  if (sortedTimes.length === 0) return [];

  const priceMap = buildPriceMap(candlesMap);
  return sortedTimes.map((time) =>
    buildHistoryPoint(time, holdings, priceMap, candlesMap)
  );
}
