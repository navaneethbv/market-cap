import type { Candle } from "./market/types";
import { calculateSMA, calculateRSI } from "./market/indicators.ts";

export type StrategyType = "sma_crossover" | "rsi_threshold";

export interface BacktestParams {
  candles: Candle[]; // assumed sorted chronologically (oldest first)
  strategy: StrategyType;
  initialCapital: number;
  smaShort?: number;
  smaLong?: number;
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
}

export interface TradeLog {
  type: "buy" | "sell";
  time: string;
  price: number;
  shares: number;
  cash: number;
  value: number;
}

export interface BacktestPoint {
  time: string;
  close: number;
  strategyValue: number;
  buyAndHoldValue: number;
}

export interface BacktestResult {
  points: BacktestPoint[];
  trades: TradeLog[];
  totalReturn: number;
  buyAndHoldReturn: number;
  maxDrawdown: number;
  buyAndHoldMaxDrawdown: number;
  winRate: number;
  tradeCount: number;
}

export interface NormalizedBacktestOptions {
  initialCapital: number;
  smaShort: number;
  smaLong: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
}

function parsePositiveNumber(value: string | null, fallback: number, label: string): number {
  const parsed = value === null ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`invalid ${label}`);
  }
  return parsed;
}

function parsePositiveInteger(value: string | null, fallback: number, label: string): number {
  const parsed = parsePositiveNumber(value, fallback, label);
  if (!Number.isInteger(parsed)) {
    throw new Error(`invalid ${label}`);
  }
  return parsed;
}

export function normalizeBacktestOptions(input: {
  strategy: StrategyType;
  initialCapital: string | null;
  smaShort: string | null;
  smaLong: string | null;
  rsiPeriod: string | null;
  rsiOversold: string | null;
  rsiOverbought: string | null;
}): NormalizedBacktestOptions {
  const initialCapital = parsePositiveNumber(
    input.initialCapital,
    10_000,
    "initial capital"
  );
  const smaShort = parsePositiveInteger(input.smaShort, 20, "short SMA period");
  const smaLong = parsePositiveInteger(input.smaLong, 50, "long SMA period");
  if (input.strategy === "sma_crossover" && smaShort >= smaLong) {
    throw new Error("short SMA period must be less than long SMA period");
  }

  const rsiPeriod = parsePositiveInteger(input.rsiPeriod, 14, "RSI period");
  const rsiOversold = parsePositiveInteger(
    input.rsiOversold,
    30,
    "RSI oversold threshold"
  );
  const rsiOverbought = parsePositiveInteger(
    input.rsiOverbought,
    70,
    "RSI overbought threshold"
  );
  if (
    input.strategy === "rsi_threshold" &&
    (rsiOversold >= rsiOverbought ||
      rsiOversold >= 100 ||
      rsiOverbought >= 100)
  ) {
    throw new Error("RSI oversold threshold must be less than overbought threshold");
  }

  return {
    initialCapital,
    smaShort,
    smaLong,
    rsiPeriod,
    rsiOversold,
    rsiOverbought,
  };
}

export function runBacktest(params: BacktestParams): BacktestResult {
  const {
    candles,
    strategy,
    initialCapital,
    smaShort = 20,
    smaLong = 50,
    rsiPeriod = 14,
    rsiOversold = 30,
    rsiOverbought = 70,
  } = params;

  if (candles.length === 0) {
    return {
      points: [],
      trades: [],
      totalReturn: 0,
      buyAndHoldReturn: 0,
      maxDrawdown: 0,
      buyAndHoldMaxDrawdown: 0,
      winRate: 0,
      tradeCount: 0,
    };
  }

  const closes = candles.map((c) => c.close);
  let shortSma: (number | null)[] = [];
  let longSma: (number | null)[] = [];
  let rsi: (number | null)[] = [];

  if (strategy === "sma_crossover") {
    shortSma = calculateSMA(closes, smaShort);
    longSma = calculateSMA(closes, smaLong);
  } else if (strategy === "rsi_threshold") {
    rsi = calculateRSI(closes, rsiPeriod);
  }

  let cash = initialCapital;
  let shares = 0;
  const trades: TradeLog[] = [];
  const points: BacktestPoint[] = [];

  // Determine starting index where indicators are valid
  let startIdx = 0;
  if (strategy === "sma_crossover") {
    startIdx = Math.max(smaShort - 1, smaLong - 1);
  } else if (strategy === "rsi_threshold") {
    startIdx = rsiPeriod;
  }

  // If data length is too short to calculate indicators, return static holds
  if (startIdx >= candles.length) {
    startIdx = 0;
  }

  const firstValidClose = candles[startIdx].close;
  const buyAndHoldShares = initialCapital / firstValidClose;

  let strategyPeak = initialCapital;
  let strategyMaxDd = 0;
  let bahPeak = initialCapital;
  let bahMaxDd = 0;

  // Track round-trip trades for win rate calculation
  const buyPriceHistory: number[] = [];
  let profitableTrades = 0;
  let closedTradesCount = 0;

  for (let i = startIdx; i < candles.length; i++) {
    const candle = candles[i];
    const close = candle.close;
    const time = candle.time;

    let signal: "buy" | "sell" | "hold" = "hold";

    if (strategy === "sma_crossover" && i > startIdx) {
      const prevShort = shortSma[i - 1];
      const prevLong = longSma[i - 1];
      const currShort = shortSma[i];
      const currLong = longSma[i];

      if (
        prevShort !== null &&
        prevLong !== null &&
        currShort !== null &&
        currLong !== null
      ) {
        if (prevShort <= prevLong && currShort > currLong) {
          signal = "buy";
        } else if (prevShort >= prevLong && currShort < currLong) {
          signal = "sell";
        }
      }
    } else if (strategy === "rsi_threshold" && i > startIdx) {
      const prevRsi = rsi[i - 1];
      const currRsi = rsi[i];

      if (prevRsi !== null && currRsi !== null) {
        if (prevRsi >= rsiOversold && currRsi < rsiOversold) {
          signal = "buy";
        } else if (prevRsi <= rsiOverbought && currRsi > rsiOverbought) {
          signal = "sell";
        }
      }
    }

    // Execute signals
    if (signal === "buy" && cash > 0) {
      shares = cash / close;
      cash = 0;
      buyPriceHistory.push(close);
      trades.push({
        type: "buy",
        time,
        price: close,
        shares,
        cash,
        value: shares * close,
      });
    } else if (signal === "sell" && shares > 0) {
      cash = shares * close;
      trades.push({
        type: "sell",
        time,
        price: close,
        shares: 0,
        cash,
        value: cash,
      });
      shares = 0;

      // Win rate math: compare close price to last buy price
      const lastBuyPrice = buyPriceHistory.pop();
      if (lastBuyPrice !== undefined) {
        closedTradesCount++;
        if (close > lastBuyPrice) {
          profitableTrades++;
        }
      }
    }

    const currentStrategyValue = cash + shares * close;
    const currentBahValue = buyAndHoldShares * close;

    // Track Peak & Drawdown for Strategy
    if (currentStrategyValue > strategyPeak) {
      strategyPeak = currentStrategyValue;
    }
    const strategyDd = (strategyPeak - currentStrategyValue) / strategyPeak;
    if (strategyDd > strategyMaxDd) {
      strategyMaxDd = strategyDd;
    }

    // Track Peak & Drawdown for Buy & Hold
    if (currentBahValue > bahPeak) {
      bahPeak = currentBahValue;
    }
    const bahDd = (bahPeak - currentBahValue) / bahPeak;
    if (bahDd > bahMaxDd) {
      bahMaxDd = bahDd;
    }

    points.push({
      time,
      close,
      strategyValue: currentStrategyValue,
      buyAndHoldValue: currentBahValue,
    });
  }

  const finalStrategyValue = points[points.length - 1]?.strategyValue ?? initialCapital;
  const finalBahValue = points[points.length - 1]?.buyAndHoldValue ?? initialCapital;

  const totalReturn = ((finalStrategyValue - initialCapital) / initialCapital) * 100;
  const buyAndHoldReturn = ((finalBahValue - initialCapital) / initialCapital) * 100;

  const winRate = closedTradesCount > 0 ? (profitableTrades / closedTradesCount) * 100 : 0;

  return {
    points,
    trades,
    totalReturn,
    buyAndHoldReturn,
    maxDrawdown: strategyMaxDd * 100,
    buyAndHoldMaxDrawdown: bahMaxDd * 100,
    winRate,
    tradeCount: trades.length,
  };
}
