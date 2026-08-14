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
    throw new TypeError(`invalid ${label}`);
  }
  return parsed;
}

function parsePositiveInteger(value: string | null, fallback: number, label: string): number {
  const parsed = parsePositiveNumber(value, fallback, label);
  if (!Number.isInteger(parsed)) {
    throw new TypeError(`invalid ${label}`);
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

interface SignalEvalOptions {
  strategy: StrategyType;
  i: number;
  startIdx: number;
  shortSma: (number | null)[];
  longSma: (number | null)[];
  rsi: (number | null)[];
  rsiOversold: number;
  rsiOverbought: number;
}

type Signal = "buy" | "sell" | "hold";

function evaluateSmaSignal(options: Readonly<SignalEvalOptions>): Signal {
  const {
    i,
    startIdx,
    shortSma,
    longSma,
  } = options;
  if (i <= startIdx) return "hold";

  const prevShort = shortSma[i - 1];
  const prevLong = longSma[i - 1];
  const currShort = shortSma[i];
  const currLong = longSma[i];
  if (prevShort === null || prevLong === null || currShort === null || currLong === null) {
    return "hold";
  }
  if (prevShort <= prevLong && currShort > currLong) return "buy";
  if (prevShort >= prevLong && currShort < currLong) return "sell";

  return "hold";
}

function evaluateRsiSignal(options: Readonly<SignalEvalOptions>): Signal {
  const { i, startIdx, rsi, rsiOversold, rsiOverbought } = options;
  if (i <= startIdx) return "hold";

  const prevRsi = rsi[i - 1];
  const currRsi = rsi[i];
  if (prevRsi === null || currRsi === null) return "hold";
  if (prevRsi >= rsiOversold && currRsi < rsiOversold) return "buy";
  if (prevRsi <= rsiOverbought && currRsi > rsiOverbought) return "sell";

  return "hold";
}

function evaluateSignal(options: Readonly<SignalEvalOptions>): Signal {
  if (options.strategy === "sma_crossover") return evaluateSmaSignal(options);
  return evaluateRsiSignal(options);
}

interface BacktestState {
  cash: number;
  shares: number;
  trades: TradeLog[];
  buyPriceHistory: number[];
  profitableTrades: number;
  closedTradesCount: number;
}

function applySignal(signal: Signal, candle: Candle, state: BacktestState): void {
  if (signal === "buy" && state.cash > 0) {
    state.shares = state.cash / candle.close;
    state.cash = 0;
    state.buyPriceHistory.push(candle.close);
    state.trades.push({
      type: "buy",
      time: candle.time,
      price: candle.close,
      shares: state.shares,
      cash: state.cash,
      value: state.shares * candle.close,
    });
    return;
  }

  if (signal !== "sell" || state.shares <= 0) return;

  state.cash = state.shares * candle.close;
  state.trades.push({
    type: "sell",
    time: candle.time,
    price: candle.close,
    shares: state.shares,
    cash: state.cash,
    value: state.cash,
  });
  state.shares = 0;

  const lastBuyPrice = state.buyPriceHistory.pop();
  if (lastBuyPrice === undefined) return;
  state.closedTradesCount++;
  if (candle.close > lastBuyPrice) state.profitableTrades++;
}

function updateDrawdown(
  currentValue: number,
  peak: number,
  maxDrawdown: number
): { peak: number; maxDrawdown: number } {
  const nextPeak = Math.max(peak, currentValue);
  const drawdown = nextPeak === 0 ? 0 : (nextPeak - currentValue) / nextPeak;
  return {
    peak: nextPeak,
    maxDrawdown: Math.max(maxDrawdown, drawdown),
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

  const state: BacktestState = {
    cash: initialCapital,
    shares: 0,
    trades: [],
    buyPriceHistory: [],
    profitableTrades: 0,
    closedTradesCount: 0,
  };
  const points: BacktestPoint[] = [];

  let startIdx = 0;
  if (strategy === "sma_crossover") {
    startIdx = Math.max(smaShort - 1, smaLong - 1);
  } else if (strategy === "rsi_threshold") {
    startIdx = rsiPeriod;
  }

  if (startIdx >= candles.length) {
    startIdx = 0;
  }

  const firstValidClose = candles[startIdx].close;
  const buyAndHoldShares = initialCapital / firstValidClose;

  let strategyPeak = initialCapital;
  let strategyMaxDd = 0;
  let bahPeak = initialCapital;
  let bahMaxDd = 0;

  for (let i = startIdx; i < candles.length; i++) {
    const candle = candles[i];
    const signal = evaluateSignal({
      strategy,
      i,
      startIdx,
      shortSma,
      longSma,
      rsi,
      rsiOversold,
      rsiOverbought,
    });
    applySignal(signal, candle, state);

    const currentStrategyValue = state.cash + state.shares * candle.close;
    const currentBahValue = buyAndHoldShares * candle.close;
    const strategyDrawdown = updateDrawdown(
      currentStrategyValue,
      strategyPeak,
      strategyMaxDd
    );
    strategyPeak = strategyDrawdown.peak;
    strategyMaxDd = strategyDrawdown.maxDrawdown;
    const bahDrawdown = updateDrawdown(currentBahValue, bahPeak, bahMaxDd);
    bahPeak = bahDrawdown.peak;
    bahMaxDd = bahDrawdown.maxDrawdown;

    points.push({
      time: candle.time,
      close: candle.close,
      strategyValue: currentStrategyValue,
      buyAndHoldValue: currentBahValue,
    });
  }

  const finalStrategyValue = points.at(-1)?.strategyValue ?? initialCapital;
  const finalBahValue = points.at(-1)?.buyAndHoldValue ?? initialCapital;

  const totalReturn = ((finalStrategyValue - initialCapital) / initialCapital) * 100;
  const buyAndHoldReturn = ((finalBahValue - initialCapital) / initialCapital) * 100;

  const winRate =
    state.closedTradesCount > 0
      ? (state.profitableTrades / state.closedTradesCount) * 100
      : 0;

  return {
    points,
    trades: state.trades,
    totalReturn,
    buyAndHoldReturn,
    maxDrawdown: strategyMaxDd * 100,
    buyAndHoldMaxDrawdown: bahMaxDd * 100,
    winRate,
    tradeCount: state.trades.length,
  };
}
