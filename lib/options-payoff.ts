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

export function calculatePayoffCurve(
  strategy: OptionStrategyType,
  spotPrice: number,
  strikePrice: number,
  premium: number,
  contracts = 1,
  secondaryStrike?: number
): OptionsPayoffSummary {
  const multiplier = contracts * 100;
  const stepCount = 40;
  const minPrice = Math.max(1, Math.round(strikePrice * 0.7));
  const maxPrice = Math.round(strikePrice * 1.3);
  const step = (maxPrice - minPrice) / stepCount;

  const points: PayoffDataPoint[] = [];
  let maxProfit: number | "unlimited" = -Infinity;
  let maxLoss: number | "unlimited" = Infinity;
  const breakevens: number[] = [];

  const upperStrike = secondaryStrike ?? strikePrice * 1.1;
  const lowerStrike = secondaryStrike ?? strikePrice * 0.9;

  switch (strategy) {
    case "long_call": {
      maxProfit = "unlimited";
      maxLoss = Number((premium * multiplier).toFixed(2));
      breakevens.push(Number((strikePrice + premium).toFixed(2)));
      for (let p = minPrice; p <= maxPrice; p += step) {
        const val = Math.max(0, p - strikePrice) - premium;
        points.push({ price: Number(p.toFixed(2)), pnl: Number((val * multiplier).toFixed(2)) });
      }
      break;
    }
    case "long_put": {
      maxProfit = Number(((strikePrice - premium) * multiplier).toFixed(2));
      maxLoss = Number((premium * multiplier).toFixed(2));
      breakevens.push(Number((strikePrice - premium).toFixed(2)));
      for (let p = minPrice; p <= maxPrice; p += step) {
        const val = Math.max(0, strikePrice - p) - premium;
        points.push({ price: Number(p.toFixed(2)), pnl: Number((val * multiplier).toFixed(2)) });
      }
      break;
    }
    case "covered_call": {
      const netCredit = premium;
      maxProfit = Number(((strikePrice - spotPrice + netCredit) * multiplier).toFixed(2));
      maxLoss = Number(((spotPrice - netCredit) * multiplier).toFixed(2));
      breakevens.push(Number((spotPrice - netCredit).toFixed(2)));
      for (let p = minPrice; p <= maxPrice; p += step) {
        const stockGain = p - spotPrice;
        const shortCallLoss = Math.max(0, p - strikePrice);
        const val = stockGain - shortCallLoss + netCredit;
        points.push({ price: Number(p.toFixed(2)), pnl: Number((val * multiplier).toFixed(2)) });
      }
      break;
    }
    case "cash_secured_put": {
      maxProfit = Number((premium * multiplier).toFixed(2));
      maxLoss = Number(((strikePrice - premium) * multiplier).toFixed(2));
      breakevens.push(Number((strikePrice - premium).toFixed(2)));
      for (let p = minPrice; p <= maxPrice; p += step) {
        const val = premium - Math.max(0, strikePrice - p);
        points.push({ price: Number(p.toFixed(2)), pnl: Number((val * multiplier).toFixed(2)) });
      }
      break;
    }
    case "bull_call_spread": {
      const netDebit = premium;
      const spreadWidth = upperStrike - strikePrice;
      maxProfit = Number(((spreadWidth - netDebit) * multiplier).toFixed(2));
      maxLoss = Number((netDebit * multiplier).toFixed(2));
      breakevens.push(Number((strikePrice + netDebit).toFixed(2)));
      for (let p = minPrice; p <= maxPrice; p += step) {
        const longPayoff = Math.max(0, p - strikePrice);
        const shortPayoff = Math.max(0, p - upperStrike);
        const val = longPayoff - shortPayoff - netDebit;
        points.push({ price: Number(p.toFixed(2)), pnl: Number((val * multiplier).toFixed(2)) });
      }
      break;
    }
    case "bear_put_spread": {
      const netDebit = premium;
      const spreadWidth = strikePrice - lowerStrike;
      maxProfit = Number(((spreadWidth - netDebit) * multiplier).toFixed(2));
      maxLoss = Number((netDebit * multiplier).toFixed(2));
      breakevens.push(Number((strikePrice - netDebit).toFixed(2)));
      for (let p = minPrice; p <= maxPrice; p += step) {
        const longPayoff = Math.max(0, strikePrice - p);
        const shortPayoff = Math.max(0, lowerStrike - p);
        const val = longPayoff - shortPayoff - netDebit;
        points.push({ price: Number(p.toFixed(2)), pnl: Number((val * multiplier).toFixed(2)) });
      }
      break;
    }
  }

  return {
    strategy,
    maxProfit,
    maxLoss,
    breakevens,
    points,
  };
}
