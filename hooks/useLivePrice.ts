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
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
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

    function scheduleReconnect() {
      if (!active || reconnectTimer !== null) return;
      // Capped exponential backoff so a brief network blip recovers the
      // live stream without hammering the websocket endpoint.
      const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
      reconnectAttempts += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    }

    function connect() {
      if (!active || !token) return;
      socket = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
      socket.addEventListener("open", () => {
        if (!active || !socket) return;
        reconnectAttempts = 0;
        setConnected(true);
        setFallback(false);
        socket.send(JSON.stringify({ type: "subscribe", symbol }));
      });
      socket.addEventListener("message", (event) => {
        let payload: FinnhubTradeMessage;
        try {
          payload = JSON.parse(String(event.data)) as FinnhubTradeMessage;
        } catch {
          return;
        }
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
        scheduleReconnect();
      });
      socket.addEventListener("error", () => {
        if (!active) return;
        setConnected(false);
        setFallback(true);
        void poll();
        // A close event always follows an error and schedules the reconnect.
      });
    }

    if (token) {
      connect();
    } else {
      void poll();
    }

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "unsubscribe", symbol }));
      }
      socket?.close();
    };
    // initialQuote only seeds state; keeping it out of the deps avoids
    // tearing down the websocket every time the server re-renders the page
  }, [symbol]);

  const status = useMemo(
    () => getLivePriceStatus({ connected, fallback }),
    [connected, fallback]
  );

  return { quote, status };
}
