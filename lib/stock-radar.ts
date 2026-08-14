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

function calculateValuationScore(pe?: number | null): number {
  if (pe === null || pe === undefined || !Number.isFinite(pe) || pe <= 0) {
    return 50;
  }
  if (pe < 12) return 95;
  if (pe < 18) return 85;
  if (pe < 25) return 70;
  if (pe < 35) return 50;
  if (pe < 50) return 35;
  return 20;
}

function calculateProfitabilityScore(
  eps?: number | null,
  divYield?: number | null
): number {
  let score = 50;
  if (eps !== null && eps !== undefined && Number.isFinite(eps)) {
    score = eps > 0 ? 70 : 30;
  }
  if (divYield !== null && divYield !== undefined && Number.isFinite(divYield) && divYield > 0) {
    score = Math.min(100, score + (divYield > 2 ? 25 : 15));
  }
  return score;
}

function calculateStabilityScore(beta?: number | null): number {
  if (beta === null || beta === undefined || !Number.isFinite(beta)) {
    return 50;
  }
  if (beta <= 0.6) return 95;
  if (beta <= 0.9) return 85;
  if (beta <= 1.2) return 75;
  if (beta <= 1.6) return 55;
  return 35;
}

function calculateMomentumScore(
  price?: number,
  high52?: number | null,
  low52?: number | null
): number {
  if (
    price === undefined ||
    high52 === null ||
    high52 === undefined ||
    low52 === null ||
    low52 === undefined ||
    high52 <= low52
  ) {
    return 50;
  }
  const rangePos = ((price - low52) / (high52 - low52)) * 100;
  return Math.max(10, Math.min(100, Math.round(rangePos)));
}

function calculateGrowthScore(eps?: number | null, price?: number): number {
  if (eps === null || eps === undefined || !price || price <= 0) {
    return 50;
  }
  const earningsYield = (eps / price) * 100;
  if (earningsYield > 6) return 85;
  if (earningsYield > 4) return 75;
  if (earningsYield > 2) return 60;
  if (earningsYield > 0) return 45;
  return 25;
}

export function computeStockDimensions(
  symbol: string,
  metrics: Partial<KeyMetrics> | null,
  quote: Partial<Quote> | null
): StockDimensionScores {
  return {
    symbol,
    valuation: calculateValuationScore(metrics?.peRatio),
    profitability: calculateProfitabilityScore(metrics?.epsTTM, metrics?.dividendYield),
    stability: calculateStabilityScore(metrics?.beta),
    momentum: calculateMomentumScore(quote?.price, metrics?.high52, metrics?.low52),
    growth: calculateGrowthScore(metrics?.epsTTM, quote?.price),
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
