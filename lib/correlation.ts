import type { Candle } from "./market/types";
import { splitSymbols } from "./symbol.ts";

export interface SymbolCandles {
  symbol: string;
  candles: Candle[];
}

export interface AlignedReturnPoint {
  date: string;
  returnA: number;
  returnB: number;
}

export interface CorrelationResult {
  matrix: Record<string, Record<string, number | null>>;
  overlapCounts: Record<string, Record<string, number>>;
}

export function normalizeCorrelationSymbols(value: string): string[] {
  return splitSymbols(value, 10);
}

/**
 * Calculates daily percentage returns for a list of candles.
 * Intraday candles are first aggregated to each trading day's closing price,
 * then close-to-close returns are computed. Returns a map of date -> return rate.
 */
export function calculateDailyReturns(candles: Candle[]): Map<string, number> {
  const returnsMap = new Map<string, number>();
  if (candles.length < 2) {
    return returnsMap;
  }

  // Sort candles chronologically by time (just to be safe)
  const sorted = [...candles].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  // Aggregate intraday candles to each trading day's closing price
  const dailyCloses = new Map<string, number>();
  for (const candle of sorted) {
    const dateKey = candle.time.slice(0, 10);
    dailyCloses.set(dateKey, candle.close);
  }

  let prevClose: number | null = null;
  for (const [dateKey, close] of dailyCloses) {
    if (prevClose !== null && prevClose > 0) {
      returnsMap.set(dateKey, (close - prevClose) / prevClose);
    }
    prevClose = close;
  }

  return returnsMap;
}

/**
 * Aligns daily returns of two symbols and returns overlapping points.
 */
export function alignReturns(
  returnsA: Map<string, number>,
  returnsB: Map<string, number>
): AlignedReturnPoint[] {
  const aligned: AlignedReturnPoint[] = [];

  for (const [date, valA] of returnsA.entries()) {
    const valB = returnsB.get(date);
    if (valB !== undefined) {
      aligned.push({
        date,
        returnA: valA,
        returnB: valB,
      });
    }
  }

  return aligned;
}

/**
 * Computes Pearson correlation coefficient for an array of return pairs.
 */
export function calculatePearsonCorrelation(
  points: AlignedReturnPoint[]
): number | null {
  if (points.length < 15) {
    return null; // Enforce minimum 15 overlapping observations
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const point of points) {
    const x = point.returnA;
    const y = point.returnB;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const varX = n * sumX2 - sumX * sumX;
  const varY = n * sumY2 - sumY * sumY;

  if (varX <= 1e-9 || varY <= 1e-9) {
    return null; // Undefined correlation (near-zero variance in returns)
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt(varX * varY);

  return num / den;
}

/**
 * Computes cross-correlation matrix across all supplied symbols.
 */
export function calculateCorrelationMatrix(
  inputs: SymbolCandles[]
): CorrelationResult {
  const returnsMap: Record<string, Map<string, number>> = {};
  const symbols = inputs.map((item) => item.symbol);

  // Compute returns for each symbol
  for (const input of inputs) {
    returnsMap[input.symbol] = calculateDailyReturns(input.candles);
  }

  const matrix: Record<string, Record<string, number | null>> = {};
  const overlapCounts: Record<string, Record<string, number>> = {};

  for (const symbolA of symbols) {
    matrix[symbolA] = {};
    overlapCounts[symbolA] = {};
  }

  for (let i = 0; i < symbols.length; i++) {
    const sA = symbols[i];
    // Self-correlation is always 1.0 (or null if returns length is insufficient)
    const returnsA = returnsMap[sA];
    matrix[sA][sA] = returnsA.size >= 15 ? 1.0 : null;
    overlapCounts[sA][sA] = returnsA.size;

    for (let j = i + 1; j < symbols.length; j++) {
      const sB = symbols[j];
      const returnsB = returnsMap[sB];

      const aligned = alignReturns(returnsA, returnsB);
      const coeff = calculatePearsonCorrelation(aligned);

      matrix[sA][sB] = coeff;
      matrix[sB][sA] = coeff;

      overlapCounts[sA][sB] = aligned.length;
      overlapCounts[sB][sA] = aligned.length;
    }
  }

  return { matrix, overlapCounts };
}
