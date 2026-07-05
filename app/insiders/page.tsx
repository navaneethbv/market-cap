"use client";

import { useState, useEffect } from "react";
import {
  Newspaper,
  Search,
  Loader2,
  Info,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, formatCompact } from "@/lib/format";
import type { InsiderTransaction } from "@/lib/market/types";
import NextLink from "next/link";

export default function InsidersPage() {
  const [symbolQuery, setSymbolQuery] = useState("");
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([]);

  const fetchTransactions = async (isWatchlist: boolean, query: string) => {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (isWatchlist) {
      qs.set("watchlist", "true");
    } else if (query.trim()) {
      qs.set("symbol", query.trim().toUpperCase());
    }

    try {
      const res = await fetch(`/api/insiders?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load insider transactions");
      }
      setTransactions(data.transactions ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error loading insider activity feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions(watchlistOnly, symbolQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setWatchlistOnly(false);
    fetchTransactions(false, symbolQuery);
  };

  const getTransactionLabel = (code: string) => {
    switch (code.toUpperCase()) {
      case "P":
        return { label: "Purchase (Buy)", isBuy: true };
      case "S":
        return { label: "Sale (Sell)", isBuy: false };
      case "G":
        return { label: "Gift", isBuy: null };
      case "A":
        return { label: "Grant / Award", isBuy: true };
      case "M":
        return { label: "Option Exercise", isBuy: true };
      default:
        return { label: `Code ${code}`, isBuy: null };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SEC Insider Trading Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track real-time buying and selling transactions by corporate officers, directors, and major blockholders.
        </p>
      </div>

      {/* Control Panel */}
      <section className="rounded-2xl border bg-card p-4.5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search symbol (e.g. AAPL)..."
                className="pl-9 rounded-xl uppercase"
                value={symbolQuery}
                onChange={(e) => setSymbolQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Search
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSymbolQuery("");
                setWatchlistOnly(!watchlistOnly);
              }}
              disabled={loading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                watchlistOnly
                  ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                  : "bg-background border-input text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Watchlist Only</span>
            </button>

            <button
              onClick={() => {
                setSymbolQuery("");
                setWatchlistOnly(false);
                fetchTransactions(false, "");
              }}
              disabled={loading}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 transition-all"
            >
              Reset Feed
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/10 text-red-400 text-sm flex items-start gap-2.5">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Transactions Table */}
      <section className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-muted-foreground/50 animate-spin" />
            <span className="text-sm text-muted-foreground">Fetching transaction feed...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <h3 className="text-sm font-semibold">No Insider Transactions Found</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Try searching a different ticker symbol or check that your watchlist contains active equities.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/20 text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4.5">Ticker</th>
                  <th className="py-3.5 px-4.5">Insider Name</th>
                  <th className="py-3.5 px-4.5">Transaction Type</th>
                  <th className="py-3.5 px-4.5 text-right">Shares Changed</th>
                  <th className="py-3.5 px-4.5 text-right">Price</th>
                  <th className="py-3.5 px-4.5 text-right">Total Size</th>
                  <th className="py-3.5 px-4.5 text-right">Filing Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((trade, idx) => {
                  const action = getTransactionLabel(trade.transactionCode);
                  const isPositive = trade.change > 0;
                  const totalCost = Math.abs(trade.change * trade.price);

                  return (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-4.5 px-4.5 font-bold">
                        <NextLink
                          href={`/stock/${trade.symbol}`}
                          className="text-blue-500 hover:text-blue-400 font-bold"
                        >
                          {trade.symbol}
                        </NextLink>
                      </td>
                      <td className="py-4.5 px-4.5 font-medium">
                        <div>{trade.name}</div>
                        <span className="text-[9.5px] text-muted-foreground font-normal">
                          {trade.isDirectShare ? "Direct Ownership" : "Indirect Ownership"}
                        </span>
                      </td>
                      <td className="py-4.5 px-4.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                            action.isBuy === true
                              ? "bg-green-500/10 text-green-400"
                              : action.isBuy === false
                              ? "bg-red-500/10 text-red-400"
                              : "bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {action.label}
                        </span>
                      </td>
                      <td className="py-4.5 px-4.5 text-right font-medium tabular-nums">
                        <span className={action.isBuy === true ? "text-green-400" : action.isBuy === false ? "text-red-400" : ""}>
                          {isPositive ? "+" : ""}
                          {trade.change.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4.5 px-4.5 text-right font-medium tabular-nums">
                        {trade.price > 0 ? formatPrice(trade.price) : "-"}
                      </td>
                      <td className="py-4.5 px-4.5 text-right font-semibold tabular-nums">
                        {totalCost > 0 ? formatCompact(totalCost) : "-"}
                      </td>
                      <td className="py-4.5 px-4.5 text-right text-muted-foreground font-medium tabular-nums">
                        {trade.filingDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
