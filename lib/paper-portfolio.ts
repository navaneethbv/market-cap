import type { Quote } from "./market/types";

export interface PaperHolding {
  id: string;
  symbol: string;
  shares: number;
  avg_cost: number;
  purchased_at: string;
  created_at: string;
}

export interface PaperHoldingRow {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  purchasedAt: string;
  quote: Quote | null;
  marketValue: number | null;
  costBasis: number;
  profitLoss: number | null;
  profitLossPercent: number | null;
  error: string | null;
}

export interface PaperPortfolioSummary {
  holdingsValue: number;
  cashBalance: number;
  totalValue: number;
  costBasis: number;
  profitLoss: number;
  profitLossPercent: number;
}

export function normalizePaperTradeInput(symbol: string, sharesStr: string | number, priceStr: string | number) {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9.^-]{1,12}$/.test(cleanSymbol)) {
    throw new Error("Invalid symbol");
  }

  const shares = typeof sharesStr === "number" ? sharesStr : Number(sharesStr);
  if (!Number.isFinite(shares) || shares <= 0) {
    throw new Error("Shares must be greater than zero");
  }

  const price = typeof priceStr === "number" ? priceStr : Number(priceStr);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be greater than zero");
  }

  return { symbol: cleanSymbol, shares, price };
}

export function buildPaperHoldingRows(
  holdings: PaperHolding[],
  quoteResults: PromiseSettledResult<Quote>[]
): PaperHoldingRow[] {
  return holdings.map((holding, index) => {
    const result = quoteResults[index];
    const quote = result?.status === "fulfilled" ? result.value : null;
    const costBasis = holding.shares * holding.avg_cost;
    const marketValue = quote ? holding.shares * quote.price : null;
    const profitLoss = marketValue === null ? null : marketValue - costBasis;
    const profitLossPercent =
      profitLoss === null || costBasis === 0 ? null : (profitLoss / costBasis) * 100;

    return {
      id: holding.id,
      symbol: holding.symbol,
      shares: holding.shares,
      avgCost: holding.avg_cost,
      purchasedAt: holding.purchased_at,
      quote,
      marketValue,
      costBasis,
      profitLoss,
      profitLossPercent,
      error:
        result?.status === "rejected"
          ? (result.reason instanceof Error ? result.reason.message : "Quote unavailable")
          : null,
    };
  });
}

export function calculatePaperPortfolioSummary(
  rows: PaperHoldingRow[],
  cashBalance: number
): PaperPortfolioSummary {
  const holdingsValue = rows.reduce((total, row) => total + (row.marketValue ?? 0), 0);
  const costBasis = rows.reduce((total, row) => total + row.costBasis, 0);
  const profitLoss = rows.reduce((total, row) => total + (row.profitLoss ?? 0), 0);
  const totalValue = holdingsValue + cashBalance;

  return {
    holdingsValue,
    cashBalance,
    totalValue,
    costBasis,
    profitLoss,
    profitLossPercent: costBasis === 0 ? 0 : (profitLoss / costBasis) * 100,
  };
}
