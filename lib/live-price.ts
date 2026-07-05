import type { Quote } from "./market/types";

const FALLBACK_POLL_INTERVAL_MS = 15_000;

export type LivePriceStatus = "Live" | "Polling" | "Waiting";

export function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function applyTradeToQuote(
  quote: Quote,
  price: number,
  timestamp: number
): Quote {
  const change = price - quote.prevClose;
  return {
    ...quote,
    price,
    change,
    changePercent:
      quote.prevClose === 0 ? 0 : roundPercent((change / quote.prevClose) * 100),
    high: Math.max(quote.high, price),
    low: quote.low === 0 ? price : Math.min(quote.low, price),
    timestamp,
  };
}

export function shouldPollQuote({
  lastPollAt,
  now,
}: {
  lastPollAt: number;
  now: number;
}): boolean {
  return now - lastPollAt >= FALLBACK_POLL_INTERVAL_MS;
}

export function getLivePriceStatus({
  connected,
  fallback,
}: {
  connected: boolean;
  fallback: boolean;
}): LivePriceStatus {
  if (connected) return "Live";
  if (fallback) return "Polling";
  return "Waiting";
}

export { FALLBACK_POLL_INTERVAL_MS };
