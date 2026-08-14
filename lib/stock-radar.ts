import type { KeyMetrics, Quote } from "./market/types";

export interface StockDimensionScores {
  symbol: string;
  valuation: number;
  profitability: number;
  stability: number;
  momentum: number;
  growth: number;
}

export interface RadarDataPoint {
  dimension: string;
  [symbol: string]: string | number;
}

export function computeStockDimensions(
  symbol: string,
  metrics: Partial<KeyMetrics> | null,
  quote: Partial<Quote> | null
): StockDimensionScores {
  // 1. Valuation Score (0-100): Lower P/E gives higher value score
  let valuation = 50;
  const pe = metrics?.peRatio;
  if (pe !== null && pe !== undefined && Number.isFinite(pe) && pe > 0) {
    if (pe < 12) valuation = 95;
    else if (pe < 18) valuation = 85;
    else if (pe < 25) valuation = 70;
    else if (pe < 35) valuation = 50;
    else if (pe < 50) valuation = 35;
    else valuation = 20;
  }

  // 2. Profitability Score (0-100): Based on positive EPS and Dividend Yield
  let profitability = 50;
  const eps = metrics?.epsTTM;
  const divYield = metrics?.dividendYield;
  if (eps !== null && eps !== undefined && Number.isFinite(eps)) {
    profitability = eps > 0 ? 70 : 30;
  }
  if (divYield !== null && divYield !== undefined && Number.isFinite(divYield) && divYield > 0) {
    profitability = Math.min(100, profitability + (divYield > 2 ? 25 : 15));
  }

  // 3. Stability Score (0-100): Lower/Moderate Beta gives higher stability
  let stability = 50;
  const beta = metrics?.beta;
  if (beta !== null && beta !== undefined && Number.isFinite(beta)) {
    if (beta <= 0.6) stability = 95;
    else if (beta <= 0.9) stability = 85;
    else if (beta <= 1.2) stability = 75;
    else if (beta <= 1.6) stability = 55;
    else stability = 35;
  }

  // 4. Momentum Score (0-100): Position within 52-week High/Low range
  let momentum = 50;
  const price = quote?.price;
  const high52 = metrics?.high52;
  const low52 = metrics?.low52;
  if (
    price !== undefined &&
    high52 !== null &&
    high52 !== undefined &&
    low52 !== null &&
    low52 !== undefined &&
    high52 > low52
  ) {
    const rangePos = ((price - low52) / (high52 - low52)) * 100;
    momentum = Math.max(10, Math.min(100, Math.round(rangePos)));
  }

  // 5. Growth Score (0-100): Derived from EPS magnitude relative to price & valuation
  let growth = 50;
  if (eps !== null && eps !== undefined && price && price > 0) {
    const earningsYield = (eps / price) * 100;
    if (earningsYield > 6) growth = 85;
    else if (earningsYield > 4) growth = 75;
    else if (earningsYield > 2) growth = 60;
    else if (earningsYield > 0) growth = 45;
    else growth = 25;
  }

  return {
    symbol,
    valuation,
    profitability,
    stability,
    momentum,
    growth,
  };
}

export function buildRadarComparisonData(
  scoresList: readonly StockDimensionScores[]
): RadarDataPoint[] {
  const dimensions = [
    { key: "valuation", label: "Valuation" },
    { key: "profitability", label: "Profitability" },
    { key: "growth", label: "Growth" },
    { key: "momentum", label: "Momentum" },
    { key: "stability", label: "Stability" },
  ] as const;

  return dimensions.map(({ key, label }) => {
    const point: RadarDataPoint = { dimension: label };
    for (const score of scoresList) {
      point[score.symbol] = score[key];
    }
    return point;
  });
}
