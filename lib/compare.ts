import type { Quote } from "@/lib/market/types";

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA"];
const MAX_SYMBOLS = 5;
const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;
const RESERVED_WORDS = new Set(["DELETE", "DROP", "FROM", "INSERT", "SELECT", "TABLE", "UPDATE"]);

export type ComparisonRow = {
  symbol: string;
  quote: Quote | null;
  rank: number | null;
  error: string | null;
};

function getReasonMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Quote unavailable";
}

export function normalizeComparisonSymbols(input: string | null | undefined) {
  const raw = input?.trim() ? input : DEFAULT_SYMBOLS.join(",");
  const symbols = raw
    .split(/[\s,]+/)
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => SYMBOL_PATTERN.test(symbol) && !RESERVED_WORDS.has(symbol));

  return [...new Set(symbols)].slice(0, MAX_SYMBOLS);
}

export function buildComparisonRows(
  symbols: string[],
  quoteResults: PromiseSettledResult<Quote>[]
): ComparisonRow[] {
  const rows = symbols.map((symbol, index) => {
    const result = quoteResults[index];
    return {
      symbol,
      quote: result?.status === "fulfilled" ? result.value : null,
      rank: null,
      error:
        result?.status === "rejected" ? getReasonMessage(result.reason) : null,
    };
  });

  const rankedSymbols = rows
    .filter((row) => row.quote)
    .toSorted((a, b) => b.quote!.changePercent - a.quote!.changePercent);

  const ranks = new Map(
    rankedSymbols.map((row, index) => [row.symbol, index + 1])
  );

  return rows.map((row) => ({
    ...row,
    rank: ranks.get(row.symbol) ?? null,
  }));
}

export function calculateComparisonSummary(rows: ComparisonRow[]) {
  const pricedRows = rows.filter(
    (row): row is ComparisonRow & { quote: Quote } => Boolean(row.quote)
  );
  const sortedRows = pricedRows.toSorted(
    (a, b) => b.quote.changePercent - a.quote.changePercent
  );
  const averageChangePercent =
    pricedRows.length === 0
      ? 0
      : pricedRows.reduce((total, row) => total + row.quote.changePercent, 0) /
        pricedRows.length;

  return {
    pricedCount: pricedRows.length,
    symbolCount: rows.length,
    best: sortedRows[0]
      ? {
          symbol: sortedRows[0].symbol,
          changePercent: sortedRows[0].quote.changePercent,
        }
      : null,
    worst: sortedRows.at(-1)
      ? {
          symbol: sortedRows.at(-1)!.symbol,
          changePercent: sortedRows.at(-1)!.quote.changePercent,
        }
      : null,
    averageChangePercent,
  };
}
