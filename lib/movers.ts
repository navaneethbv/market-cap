import type { Quote } from "@/lib/market/types";

export type MoverBasket = {
  id: string;
  label: string;
  description: string;
  symbols: string[];
};

export type MoverDirection = "up" | "down" | "flat" | "unavailable";

export type MoverRow = {
  symbol: string;
  quote: Quote | null;
  error: string | null;
  direction: MoverDirection;
};

export const MOVER_BASKETS: MoverBasket[] = [
  {
    id: "mega-cap",
    label: "Mega Cap",
    description: "Large, liquid names that shape the broad market.",
    symbols: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA"],
  },
  {
    id: "ai",
    label: "AI",
    description: "Chip and platform names driving the AI trade.",
    symbols: ["NVDA", "AMD", "AVGO", "MSFT", "GOOGL", "META"],
  },
  {
    id: "finance",
    label: "Finance",
    description: "Banks and payment networks with macro sensitivity.",
    symbols: ["JPM", "BAC", "GS", "MS", "V", "MA"],
  },
  {
    id: "etfs",
    label: "ETFs",
    description: "Broad index and sector funds for market context.",
    symbols: ["SPY", "QQQ", "DIA", "IWM", "XLK", "XLF"],
  },
];

function getReasonMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Quote unavailable";
}

function directionForQuote(quote: Quote | null): MoverDirection {
  if (!quote) return "unavailable";
  if (quote.changePercent > 0) return "up";
  if (quote.changePercent < 0) return "down";
  return "flat";
}

export function getMoverBasket(input: string | null | undefined) {
  return (
    MOVER_BASKETS.find((basket) => basket.id === input) ?? MOVER_BASKETS[0]
  );
}

export function buildMoverRows(
  symbols: string[],
  quoteResults: PromiseSettledResult<Quote>[]
): MoverRow[] {
  return symbols.map((symbol, index) => {
    const result = quoteResults[index];
    const quote = result?.status === "fulfilled" ? result.value : null;
    return {
      symbol,
      quote,
      error:
        result?.status === "rejected" ? getReasonMessage(result.reason) : null,
      direction: directionForQuote(quote),
    };
  });
}

export function getTopMovers(rows: MoverRow[], limit = 3) {
  const quotedRows = rows.filter(
    (row): row is MoverRow & { quote: Quote } => Boolean(row.quote)
  );

  return {
    gainers: quotedRows
      .toSorted((a, b) => b.quote.changePercent - a.quote.changePercent)
      .slice(0, limit),
    losers: quotedRows
      .toSorted((a, b) => a.quote.changePercent - b.quote.changePercent)
      .slice(0, limit),
  };
}

export function calculateMoversSummary(rows: MoverRow[]) {
  const quotedRows = rows.filter(
    (row): row is MoverRow & { quote: Quote } => Boolean(row.quote)
  );
  const averageChangePercent =
    quotedRows.length === 0
      ? 0
      : quotedRows.reduce((total, row) => total + row.quote.changePercent, 0) /
        quotedRows.length;

  return {
    symbolCount: rows.length,
    quotedCount: quotedRows.length,
    advancingCount: quotedRows.filter((row) => row.quote.changePercent > 0)
      .length,
    decliningCount: quotedRows.filter((row) => row.quote.changePercent < 0)
      .length,
    flatCount: quotedRows.filter((row) => row.quote.changePercent === 0).length,
    averageChangePercent,
  };
}
