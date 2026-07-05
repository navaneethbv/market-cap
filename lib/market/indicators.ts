import type { Candle } from "./types";

export interface IndicatorsResult {
  sma50: (number | null)[];
  sma200: (number | null)[];
  ema20: (number | null)[];
  bollinger: {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  };
  rsi: (number | null)[];
  macd: {
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
  };
}

export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

export function calculateEMA(prices: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = [];
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sum += prices[i];
      ema.push(null);
    } else if (i === period - 1) {
      sum += prices[i];
      ema.push(sum / period);
    } else {
      const prevEma = ema[i - 1];
      if (prevEma === null) {
        ema.push(null);
      } else {
        ema.push(prices[i] * k + prevEma * (1 - k));
      }
    }
  }
  return ema;
}

export function calculateBollingerBands(
  prices: number[],
  period = 20,
  multiplier = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  const sma = calculateSMA(prices, period);

  for (let i = 0; i < prices.length; i++) {
    if (sma[i] === null || i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
    } else {
      const m = sma[i] as number;
      middle.push(m);

      let sumSqDiff = 0;
      for (let j = 0; j < period; j++) {
        const diff = prices[i - j] - m;
        sumSqDiff += diff * diff;
      }
      const stdDev = Math.sqrt(sumSqDiff / period);
      upper.push(m + multiplier * stdDev);
      lower.push(m - multiplier * stdDev);
    }
  }
  return { upper, middle, lower };
}

export function calculateRSI(prices: number[], period = 14): (number | null)[] {
  const rsi: (number | null)[] = Array(prices.length).fill(null);
  if (prices.length <= period) {
    return rsi;
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }

  avgGain = avgGain / period;
  avgLoss = avgLoss / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  for (let i = period + 1; i < prices.length; i++) {
    const currentGain = gains[i - 1];
    const currentLoss = losses[i - 1];

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }
  return rsi;
}

export function calculateMACD(
  prices: number[],
  slowPeriod = 26,
  fastPeriod = 12,
  signalPeriod = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEma = calculateEMA(prices, fastPeriod);
  const slowEma = calculateEMA(prices, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    const f = fastEma[i];
    const s = slowEma[i];
    if (f === null || s === null) {
      macdLine.push(null);
    } else {
      macdLine.push(f - s);
    }
  }

  const signalLine: (number | null)[] = [];
  const histogram: (number | null)[] = [];

  const firstValidIndex = macdLine.findIndex((val) => val !== null);
  if (firstValidIndex === -1 || macdLine.length - firstValidIndex < signalPeriod) {
    return {
      macdLine: Array(prices.length).fill(null),
      signalLine: Array(prices.length).fill(null),
      histogram: Array(prices.length).fill(null),
    };
  }

  const validMacdVals = macdLine.slice(firstValidIndex) as number[];
  const subSignal = calculateEMA(validMacdVals, signalPeriod);

  for (let i = 0; i < prices.length; i++) {
    if (i < firstValidIndex) {
      signalLine.push(null);
      histogram.push(null);
    } else {
      const subIndex = i - firstValidIndex;
      const sig = subSignal[subIndex];
      signalLine.push(sig);

      const macdVal = macdLine[i];
      if (macdVal === null || sig === null) {
        histogram.push(null);
      } else {
        histogram.push(macdVal - sig);
      }
    }
  }

  return { macdLine, signalLine, histogram };
}

export function calculateIndicators(candles: Candle[]): IndicatorsResult {
  const prices = candles.map((c) => c.close);
  return {
    sma50: calculateSMA(prices, 50),
    sma200: calculateSMA(prices, 200),
    ema20: calculateEMA(prices, 20),
    bollinger: calculateBollingerBands(prices, 20, 2),
    rsi: calculateRSI(prices, 14),
    macd: calculateMACD(prices, 26, 12, 9),
  };
}
