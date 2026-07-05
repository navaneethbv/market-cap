import type { Quote } from "@/lib/market/types";

export type QuotePayload =
  | { status: 200; body: { quotes: Record<string, Quote> } }
  | { status: 502; body: { error: string; quotes: Record<string, Quote> } };

export function buildQuotePayload(
  settled: PromiseSettledResult<Quote>[]
): QuotePayload {
  const quotes: Record<string, Quote> = {};
  for (const result of settled) {
    if (result.status === "fulfilled") {
      quotes[result.value.symbol] = result.value;
    }
  }

  if (Object.keys(quotes).length === 0) {
    return {
      status: 502,
      body: { error: "Failed to load quotes", quotes },
    };
  }

  return { status: 200, body: { quotes } };
}
