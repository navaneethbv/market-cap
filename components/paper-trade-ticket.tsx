"use client";

import { useState } from "react";
import { IdempotencyKeyInput } from "@/components/idempotency-key-input";
import { TradeTicketButtons } from "@/components/trade-submit-buttons";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { Quote } from "@/lib/market/types";

export function PaperTradeTicket({
  ticketSymbol,
  ticketQuote,
  action,
}: Readonly<{
  ticketSymbol: string;
  ticketQuote: Quote | null;
  action: (formData: FormData) => Promise<void>;
}>) {
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [symbol, setSymbol] = useState(ticketSymbol);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Trade ticket</h2>
          <p className="text-sm text-muted-foreground">
            {orderType === "market" && "Market orders fill instantly at the latest quote."}
            {orderType === "limit" && "Limit orders fill when the market price meets your target."}
            {orderType === "stop" && "Stop-loss orders trigger when price crosses your threshold."}
            {ticketQuote && ` ${ticketQuote.symbol} is at ${formatPrice(ticketQuote.price)}.`}
          </p>
        </div>

        {/* Order Type Toggle */}
        <div className="flex rounded-full bg-muted p-1 self-start">
          <button
            type="button"
            onClick={() => setOrderType("market")}
            className={cn(
              "h-7 rounded-full px-3 text-xs font-semibold transition-colors",
              orderType === "market"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType("limit")}
            className={cn(
              "h-7 rounded-full px-3 text-xs font-semibold transition-colors",
              orderType === "limit"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType("stop")}
            className={cn(
              "h-7 rounded-full px-3 text-xs font-semibold transition-colors",
              orderType === "stop"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Stop
          </button>
        </div>
      </div>

      <form action={action} className="flex flex-wrap items-end gap-3">
        <IdempotencyKeyInput />
        <input type="hidden" name="orderType" value={orderType} />

        <div className="grid gap-1.5">
          <label htmlFor="trade-symbol" className="text-xs font-medium">
            Symbol
          </label>
          <input
            id="trade-symbol"
            name="symbol"
            required
            maxLength={12}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-32 rounded-full border px-4 text-sm uppercase shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="trade-shares" className="text-xs font-medium">
            Shares
          </label>
          <input
            id="trade-shares"
            name="shares"
            type="number"
            min="1"
            step="1"
            required
            placeholder="10"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-28 rounded-full border px-4 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>

        {orderType === "limit" && (
          <div className="grid gap-1.5 animate-in fade-in-0">
            <label htmlFor="trade-limit-price" className="text-xs font-medium">
              Limit Price ($)
            </label>
            <input
              id="trade-limit-price"
              name="limitPrice"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder={ticketQuote ? ticketQuote.price.toFixed(2) : "150.00"}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-32 rounded-full border px-4 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
        )}

        {orderType === "stop" && (
          <div className="grid gap-1.5 animate-in fade-in-0">
            <label htmlFor="trade-stop-price" className="text-xs font-medium">
              Stop Price ($)
            </label>
            <input
              id="trade-stop-price"
              name="stopPrice"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder={ticketQuote ? (ticketQuote.price * 0.95).toFixed(2) : "140.00"}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-32 rounded-full border px-4 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
        )}

        <TradeTicketButtons />
      </form>
    </section>
  );
}
