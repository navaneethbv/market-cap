export type OptionStrategyType =
  | "long_call"
  | "long_put"
  | "covered_call"
  | "cash_secured_put"
  | "bull_call_spread"
  | "bear_put_spread";

export interface PayoffDataPoint {
  price: number;
  pnl: number;
}

export interface OptionsPayoffSummary {
  strategy: OptionStrategyType;
  maxProfit: number | "unlimited";
  maxLoss: number | "unlimited";
  breakevens: number[];
  points: PayoffDataPoint[];
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

function createPayoff(
  strategy: OptionStrategyType,
  spotPrice: number,
  strikePrice: number,
  premium: number,
  contracts: number,
  secondaryStrike?: number
) {
  for (const [label, value] of [["Spot price", spotPrice], ["Strike price", strikePrice]] as const) {
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) {
      throw new Error(`${label} must be greater than zero and at most $1 billion.`);
    }
  }
  if (!Number.isFinite(premium) || premium < 0 || premium > 1_000_000_000) {
    throw new Error("Premium must be between $0 and $1 billion.");
  }
  if (!Number.isInteger(contracts) || contracts < 1 || contracts > 100) {
    throw new Error("Contracts must be a whole number from 1 to 100.");
  }
  const second = secondaryStrike ?? strikePrice * (strategy === "bear_put_spread" ? 0.9 : 1.1);
  if (strategy === "bull_call_spread" || strategy === "bear_put_spread") {
    if (!Number.isFinite(second) || second <= 0 || second > 1_000_000_000) {
      throw new Error("Secondary strike must be greater than zero and at most $1 billion.");
    }
    if (strategy === "bull_call_spread" && second <= strikePrice) {
      throw new Error("A bull call spread needs a secondary strike above the primary strike.");
    }
    if (strategy === "bear_put_spread" && second >= strikePrice) {
      throw new Error("A bear put spread needs a secondary strike below the primary strike.");
    }
  }

  let perShare: (price: number) => number;
  let breakeven: number;
  switch (strategy) {
    case "long_call":
      perShare = (price) => Math.max(0, price - strikePrice) - premium;
      breakeven = strikePrice + premium;
      break;
    case "long_put":
      perShare = (price) => Math.max(0, strikePrice - price) - premium;
      breakeven = strikePrice - premium;
      break;
    case "covered_call":
      perShare = (price) => Math.min(price, strikePrice) - spotPrice + premium;
      breakeven = spotPrice - premium;
      break;
    case "cash_secured_put":
      perShare = (price) => premium - Math.max(0, strikePrice - price);
      breakeven = strikePrice - premium;
      break;
    case "bull_call_spread":
      perShare = (price) => Math.max(0, price - strikePrice) - Math.max(0, price - second) - premium;
      breakeven = strikePrice + premium;
      break;
    case "bear_put_spread":
      perShare = (price) => Math.max(0, strikePrice - price) - Math.max(0, second - price) - premium;
      breakeven = strikePrice - premium;
      break;
    default:
      throw new Error("Choose a supported options strategy.");
  }
  return { perShare, breakeven, second, multiplier: contracts * 100 };
}

export function calculateExpirationPayoff(
  strategy: OptionStrategyType,
  expirationPrice: number,
  spotPrice: number,
  strikePrice: number,
  premium: number,
  contracts = 1,
  secondaryStrike?: number
): number {
  if (!Number.isFinite(expirationPrice) || expirationPrice < 0 || expirationPrice > 1_000_000_000) {
    throw new Error("Expiration price must be between $0 and $1 billion.");
  }
  const payoff = createPayoff(strategy, spotPrice, strikePrice, premium, contracts, secondaryStrike);
  return roundMoney(payoff.perShare(expirationPrice) * payoff.multiplier);
}

export function calculatePayoffCurve(
  strategy: OptionStrategyType,
  spotPrice: number,
  strikePrice: number,
  premium: number,
  contracts = 1,
  secondaryStrike?: number
): OptionsPayoffSummary {
  const { perShare, breakeven, second, multiplier } = createPayoff(
    strategy, spotPrice, strikePrice, premium, contracts, secondaryStrike
  );
  const isSpread = strategy === "bull_call_spread" || strategy === "bear_put_spread";
  const breakevens = breakeven >= 0 && Math.abs(perShare(breakeven)) < 1e-8
    ? [breakeven]
    : [];
  const maxPrice = Math.max(spotPrice, strikePrice, isSpread ? second : 0, ...breakevens) * 1.3;
  const endpoints = [perShare(0), perShare(maxPrice)];
  // Index-based sampling always terminates, including penny stocks and $1 strikes.
  // Include exact strikes and breakevens so the chart preserves payoff corners.
  const prices = new Set([0, spotPrice, strikePrice, maxPrice, ...breakevens]);
  if (isSpread) prices.add(second);
  for (let index = 1; index < 80; index++) prices.add((maxPrice * index) / 80);

  return {
    strategy,
    maxProfit: strategy === "long_call" ? "unlimited" : roundMoney(Math.max(0, ...endpoints) * multiplier),
    maxLoss: roundMoney(Math.max(0, ...endpoints.map((value) => -value)) * multiplier),
    breakevens,
    points: [...prices].sort((a, b) => a - b).map((price) => ({ price, pnl: roundMoney(perShare(price) * multiplier) })),
  };
}
