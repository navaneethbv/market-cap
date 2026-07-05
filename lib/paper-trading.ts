import type { Quote } from "./market/types";

export type PaperTradeSide = "buy" | "sell";

export interface PaperTrade {
  id: string;
  symbol: string;
  side: PaperTradeSide;
  shares: number;
  price: number;
  executed_at: string;
}

export interface PaperTradeInput {
  symbol: string;
  side: string;
  shares: string | number;
}

export interface NormalizedPaperTradeInput {
  symbol: string;
  side: PaperTradeSide;
  shares: number;
}

export interface PaperPosition {
  symbol: string;
  shares: number;
  avgCost: number;
  costBasis: number;
}

export interface PaperPortfolio {
  cashDelta: number;
  positions: PaperPosition[];
  realizedPnl: number;
}

export interface PaperPositionRow extends PaperPosition {
  quote: Quote | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPercent: number | null;
  error: string | null;
}

export interface PaperSummary {
  cash: number;
  marketValue: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalReturn: number;
  totalReturnPercent: number;
}

export const DEFAULT_STARTING_CASH = 100_000;

const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;

export function normalizePaperTradeInput(
  input: PaperTradeInput
): NormalizedPaperTradeInput {
  const symbol = input.symbol.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new Error("Invalid symbol");
  }

  if (input.side !== "buy" && input.side !== "sell") {
    throw new Error("Invalid trade side");
  }

  const shares =
    typeof input.shares === "number" ? input.shares : Number(input.shares);
  if (!Number.isInteger(shares) || shares <= 0) {
    throw new Error("Shares must be a positive whole number");
  }

  return { symbol, side: input.side, shares };
}

export function buildPaperPortfolio(trades: PaperTrade[]): PaperPortfolio {
  const ordered = trades.toSorted((a, b) =>
    a.executed_at.localeCompare(b.executed_at)
  );
  const bySymbol = new Map<string, { shares: number; costBasis: number }>();
  let cashDelta = 0;
  let realizedPnl = 0;

  for (const trade of ordered) {
    const position = bySymbol.get(trade.symbol) ?? { shares: 0, costBasis: 0 };
    const value = trade.shares * trade.price;

    if (trade.side === "buy") {
      cashDelta -= value;
      position.shares += trade.shares;
      position.costBasis += value;
    } else {
      cashDelta += value;
      const avgCost =
        position.shares === 0 ? 0 : position.costBasis / position.shares;
      realizedPnl += (trade.price - avgCost) * trade.shares;
      position.costBasis -= avgCost * trade.shares;
      position.shares -= trade.shares;
    }

    if (position.shares > 0) {
      bySymbol.set(trade.symbol, position);
    } else {
      bySymbol.delete(trade.symbol);
    }
  }

  return {
    cashDelta,
    realizedPnl,
    positions: [...bySymbol.entries()]
      .map(([symbol, { shares, costBasis }]) => ({
        symbol,
        shares,
        avgCost: costBasis / shares,
        costBasis,
      }))
      .toSorted((a, b) => a.symbol.localeCompare(b.symbol)),
  };
}

export function validatePaperTrade({
  side,
  shares,
  price,
  cash,
  positionShares,
}: {
  side: PaperTradeSide;
  shares: number;
  price: number;
  cash: number;
  positionShares: number;
}): string | null {
  if (!Number.isFinite(price) || price <= 0) {
    return "No valid market price for this order";
  }
  if (side === "buy" && shares * price > cash) {
    return "Insufficient cash for this order";
  }
  if (side === "sell" && shares > positionShares) {
    return "Not enough shares to sell";
  }
  return null;
}

export function buildPaperPositionRows(
  positions: PaperPosition[],
  quoteResults: PromiseSettledResult<Quote>[]
): PaperPositionRow[] {
  return positions.map((position, index) => {
    const result = quoteResults[index];
    const quote = result?.status === "fulfilled" ? result.value : null;
    const marketValue = quote ? position.shares * quote.price : null;
    const unrealizedPnl =
      marketValue === null ? null : marketValue - position.costBasis;

    return {
      ...position,
      quote,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPercent:
        unrealizedPnl === null || position.costBasis === 0
          ? null
          : (unrealizedPnl / position.costBasis) * 100,
      error:
        result?.status === "rejected"
          ? result.reason instanceof Error
            ? result.reason.message
            : "Quote unavailable"
          : null,
    };
  });
}

export function buildPaperSummary({
  startingCash,
  portfolio,
  positionRows,
}: {
  startingCash: number;
  portfolio: PaperPortfolio;
  positionRows: PaperPositionRow[];
}): PaperSummary {
  const cash = startingCash + portfolio.cashDelta;
  // Positions without a live quote are counted at cost basis so equity
  // stays meaningful when a quote fetch fails
  const marketValue = positionRows.reduce(
    (total, row) => total + (row.marketValue ?? row.costBasis),
    0
  );
  const unrealizedPnl = positionRows.reduce(
    (total, row) => total + (row.unrealizedPnl ?? 0),
    0
  );
  const equity = cash + marketValue;
  const totalReturn = equity - startingCash;

  return {
    cash,
    marketValue,
    equity,
    unrealizedPnl,
    realizedPnl: portfolio.realizedPnl,
    totalReturn,
    totalReturnPercent:
      startingCash === 0 ? 0 : (totalReturn / startingCash) * 100,
  };
}
