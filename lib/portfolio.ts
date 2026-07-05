import type { Quote } from "./market/types";

export interface Holding {
  id: string;
  symbol: string;
  shares: number;
  avg_cost: number;
  purchased_at: string;
  created_at: string;
}

export interface HoldingInput {
  symbol: string;
  shares: string | number;
  avgCost: string | number;
  purchasedAt: string;
}

export interface NormalizedHoldingInput {
  symbol: string;
  shares: number;
  avgCost: number;
  purchasedAt: string;
}

export interface HoldingRow {
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

export interface PortfolioSummary {
  marketValue: number;
  costBasis: number;
  profitLoss: number;
  profitLossPercent: number;
  pricedHoldingCount: number;
  holdingCount: number;
}

function parsePositiveNumber(value: string | number, label: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }
  return parsed;
}

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function isValidSymbol(value: string): boolean {
  return /^[A-Z0-9.^-]{1,12}$/.test(value);
}

function getQuoteError(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Quote unavailable";
}

export function normalizeHoldingInput(input: HoldingInput): NormalizedHoldingInput {
  const symbol = normalizeSymbol(input.symbol);
  if (!isValidSymbol(symbol)) {
    throw new Error("Invalid symbol");
  }

  const purchasedAt = String(input.purchasedAt ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt)) {
    throw new Error("Purchase date is required");
  }

  return {
    symbol,
    shares: parsePositiveNumber(input.shares, "Shares"),
    avgCost: parsePositiveNumber(input.avgCost, "Average cost"),
    purchasedAt,
  };
}

export function buildHoldingRows(
  holdings: Holding[],
  quoteResults: PromiseSettledResult<Quote>[]
): HoldingRow[] {
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
          ? getQuoteError(result.reason)
          : null,
    };
  });
}

export function calculatePortfolioSummary(rows: HoldingRow[]): PortfolioSummary {
  const marketValue = rows.reduce((total, row) => total + (row.marketValue ?? 0), 0);
  const costBasis = rows.reduce((total, row) => total + row.costBasis, 0);
  const profitLoss = rows.reduce(
    (total, row) => total + (row.profitLoss ?? 0),
    0
  );
  return {
    marketValue,
    costBasis,
    profitLoss,
    profitLossPercent: costBasis === 0 ? 0 : (profitLoss / costBasis) * 100,
    pricedHoldingCount: rows.filter((row) => row.marketValue !== null).length,
    holdingCount: rows.length,
  };
}
