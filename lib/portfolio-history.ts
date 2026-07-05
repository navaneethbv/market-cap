import type { Candle } from "./market/types";
import type { Holding } from "./portfolio";

export interface PortfolioHistoryPoint {
  time: string;
  value: number;
  costBasis: number;
  profitLoss: number;
  profitLossPercent: number;
}

export function calculatePortfolioHistory(
  holdings: Holding[],
  candlesMap: Record<string, Candle[]>
): PortfolioHistoryPoint[] {
  if (holdings.length === 0) return [];

  const allTimesSet = new Set<string>();
  for (const symbol in candlesMap) {
    for (const candle of candlesMap[symbol]) {
      allTimesSet.add(candle.time);
    }
  }

  if (allTimesSet.size === 0) return [];

  const sortedTimes = Array.from(allTimesSet).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const priceMap: Record<string, Map<string, number>> = {};
  for (const symbol in candlesMap) {
    priceMap[symbol] = new Map();
    for (const candle of candlesMap[symbol]) {
      priceMap[symbol].set(candle.time, candle.close);
    }
  }

  const history: PortfolioHistoryPoint[] = [];

  const getPriceOnOrBefore = (symbol: string, time: string): number => {
    const directPrice = priceMap[symbol]?.get(time);
    if (directPrice !== undefined) return directPrice;

    const symbolCandles = candlesMap[symbol] ?? [];
    const targetTime = new Date(time).getTime();

    let lastKnownPrice = 0;
    for (const candle of symbolCandles) {
      const candleTime = new Date(candle.time).getTime();
      if (candleTime <= targetTime) {
        lastKnownPrice = candle.close;
      } else {
        break;
      }
    }
    return lastKnownPrice;
  };

  for (const time of sortedTimes) {
    let totalValue = 0;
    let totalCost = 0;

    const candleDateStr = time.slice(0, 10);

    for (const holding of holdings) {
      if (holding.purchased_at <= candleDateStr) {
        const price = getPriceOnOrBefore(holding.symbol, time);
        totalValue += holding.shares * price;
        totalCost += holding.shares * holding.avg_cost;
      }
    }

    const profitLoss = totalValue - totalCost;
    const profitLossPercent = totalCost === 0 ? 0 : (profitLoss / totalCost) * 100;

    history.push({
      time,
      value: totalValue,
      costBasis: totalCost,
      profitLoss,
      profitLossPercent,
    });
  }

  return history;
}
