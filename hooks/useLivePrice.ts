"use client";

import { useEffect, useMemo, useState } from "react";
import type { Quote } from "@/lib/market/types";
import { FALLBACK_POLL_INTERVAL_MS, getLivePriceStatus } from "@/lib/live-price";

async function fetchQuote(symbol: string, signal?: AbortSignal): Promise<Quote | null> {
  const params = new URLSearchParams({ symbol });
  const response = await fetch(`/api/quote?${params}`, { signal });
  if (!response.ok) return null;
  const data = (await response.json()) as { quotes?: Record<string, Quote> };
  return data.quotes?.[symbol] ?? null;
}

export function useLivePrice({
  symbol,
  initialQuote,
}: {
  symbol: string;
  initialQuote: Quote;
}) {
  const [quote, setQuote] = useState(initialQuote);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function poll() {
      try {
        const nextQuote = await fetchQuote(symbol, controller.signal);
        if (active && nextQuote) {
          setQuote(nextQuote);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("live quote poll failed:", error);
        }
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), FALLBACK_POLL_INTERVAL_MS);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
    // initialQuote only seeds state; keeping it out of the deps avoids
    // restarting polling when the server re-renders the page
  }, [symbol]);

  const status = useMemo(
    () => getLivePriceStatus({ connected: false, fallback: true }),
    []
  );

  return { quote, status };
}
