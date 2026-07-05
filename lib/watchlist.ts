import type { Quote } from "./market/types";

export interface WatchlistItem {
  id: string;
  symbol: string;
  created_at: string;
}

export interface WatchlistRow {
  symbol: string;
  addedAt: string;
  quote: Quote | null;
  error: string | null;
}

export function normalizeWatchlistSymbol(value: string): string {
  return value.trim().toUpperCase();
}

export function isWatchlistSymbol(value: string): boolean {
  return /^[A-Z0-9.^-]{1,12}$/.test(value);
}

export function getSafeWatchlistNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/watchlist";
  if (!value.startsWith("/") || value.startsWith("//")) return "/watchlist";
  return value;
}

export function getWatchlistQuoteError(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Quote unavailable";
}

export function buildWatchlistRows(
  items: WatchlistItem[],
  quoteResults: PromiseSettledResult<Quote>[]
): WatchlistRow[] {
  return items.map((item, index) => {
    const result = quoteResults[index];
    return {
      symbol: item.symbol,
      addedAt: item.created_at,
      quote: result?.status === "fulfilled" ? result.value : null,
      error:
        result?.status === "rejected"
          ? getWatchlistQuoteError(result.reason)
          : null,
    };
  });
}
