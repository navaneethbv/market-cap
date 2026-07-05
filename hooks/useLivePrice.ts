"use client";

import { useEffect, useMemo, useState } from "react";
import type { Quote } from "@/lib/market/types";
import {
  applyTradeToQuote,
  FALLBACK_POLL_INTERVAL_MS,
  getLivePriceStatus,
} from "@/lib/live-price";

const HAS_FINNHUB_TOKEN = Boolean(process.env.NEXT_PUBLIC_FINNHUB_API_KEY);

type FinnhubTradeMessage = {
  type?: string;
  data?: { s: string; p: number; t: number }[];
};

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
  const [connected, setConnected] = useState(false);
  const [fallback, setFallback] = useState(!HAS_FINNHUB_TOKEN);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    const controller = new AbortController();
    const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

    async function poll() {
      const nextQuote = await fetchQuote(symbol, controller.signal);
      if (active && nextQuote) {
        setQuote(nextQuote);
      }
    }

    const interval = window.setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setFallback(true);
        void poll();
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    if (token) {
      socket = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
      socket.addEventListener("open", () => {
        if (!active || !socket) return;
        setConnected(true);
        setFallback(false);
        socket.send(JSON.stringify({ type: "subscribe", symbol }));
      });
      socket.addEventListener("message", (event) => {
        const payload = JSON.parse(String(event.data)) as FinnhubTradeMessage;
        if (payload.type !== "trade" || !payload.data?.length) return;
        const trade = [...payload.data]
          .reverse()
          .find((item) => item.s.toUpperCase() === symbol);
        if (!trade) return;
        setQuote((current) =>
          applyTradeToQuote(current, trade.p, Math.floor(trade.t / 1000))
        );
      });
      socket.addEventListener("close", () => {
        if (!active) return;
        setConnected(false);
        setFallback(true);
        void poll();
      });
      socket.addEventListener("error", () => {
        if (!active) return;
        setConnected(false);
        setFallback(true);
        void poll();
      });
    } else {
      void poll();
    }

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "unsubscribe", symbol }));
      }
      socket?.close();
    };
  }, [initialQuote, symbol]);

  const status = useMemo(
    () => getLivePriceStatus({ connected, fallback }),
    [connected, fallback]
  );

  return { quote, status };
}
