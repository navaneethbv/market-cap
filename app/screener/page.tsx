"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, ArrowUpDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChangeChip } from "@/components/change-chip";
import {
  filterScreenerStocks,
  sortScreenerStocks,
  type ScreenerStock,
} from "@/lib/screener";
import { formatCompact, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ScreenerPage() {
  const [allStocks, setAllStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [marketCap, setMarketCap] = useState("All");
  const [valuation, setValuation] = useState("All");
  const [sortBy, setSortBy] = useState("marketCap");

  useEffect(() => {
    fetch("/api/screener")
      .then((res) => res.json())
      .then((data) => {
        if (data.stocks) {
          setAllStocks(data.stocks);
        }
      })
      .catch((err) => console.error("Failed to load screener data:", err))
      .finally(() => setLoading(false));
  }, []);

  // Apply filters
  const filtered = filterScreenerStocks(allStocks, { sector, marketCap, valuation }).filter((s) =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply sorting
  const sorted = sortScreenerStocks(filtered, sortBy);

  const sectorsList = [
    "All",
    "Technology",
    "Consumer Cyclical",
    "Communication Services",
    "Financials",
    "Consumer Defensive",
    "Healthcare",
    "Energy",
    "Industrials",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Screener</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter and sort through top US equities to find your next investment opportunity.
        </p>
      </div>

      {/* Filter and Control Bar */}
      <section className="rounded-2xl border bg-card p-4.5 shadow-sm space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search symbol or name..."
              className="pl-9 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sector Filter */}
          <div className="flex flex-col gap-1.5">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option disabled>Select Sector</option>
              {sectorsList.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === "All" ? "All Sectors" : sec}
                </option>
              ))}
            </select>
          </div>

          {/* Market Cap Filter */}
          <div className="flex flex-col gap-1.5">
            <select
              value={marketCap}
              onChange={(e) => setMarketCap(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="All">All Market Caps</option>
              <option value="Mega">Mega Cap (&gt; $100B)</option>
              <option value="Large">Large Cap ($10B - $100B)</option>
              <option value="MidSmall">Mid & Small Cap (&lt; $10B)</option>
            </select>
          </div>

          {/* Valuation/Dividends Filter */}
          <div className="flex flex-col gap-1.5">
            <select
              value={valuation}
              onChange={(e) => setValuation(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="All">All Valuations</option>
              <option value="Growth">Growth (P/E &gt; 30)</option>
              <option value="Value">Value (P/E &lt; 15)</option>
              <option value="Income">High Yield (&gt; 2.0%)</option>
            </select>
          </div>
        </div>

        {/* Sort Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 mt-1.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
            <Layers className="h-3.5 w-3.5" />
            Showing {sorted.length} matches
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort by:
            </span>
            <div className="flex gap-1 bg-muted p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setSortBy("marketCap")}
                className={cn("px-2.5 py-1 rounded-md transition-all", sortBy === "marketCap" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                Cap Size
              </button>
              <button
                onClick={() => setSortBy("peRatio")}
                className={cn("px-2.5 py-1 rounded-md transition-all", sortBy === "peRatio" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                P/E Ratio
              </button>
              <button
                onClick={() => setSortBy("dividendYield")}
                className={cn("px-2.5 py-1 rounded-md transition-all", sortBy === "dividendYield" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                Yield %
              </button>
              <button
                onClick={() => setSortBy("changePercent")}
                className={cn("px-2.5 py-1 rounded-md transition-all", sortBy === "changePercent" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                1D Price
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Screener Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground font-semibold">
            No stock listings match your filter selections. Try relaxing the query constraints!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((stock) => (
            <div key={stock.symbol} className="group relative rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20 flex flex-col justify-between min-h-[185px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-wider text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">
                      {stock.sector}
                    </span>
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors flex items-center gap-1.5 pt-1">
                      {stock.symbol}
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold line-clamp-1">
                      {stock.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <span className="text-base font-bold tabular-nums">
                      {formatPrice(stock.price)}
                    </span>
                    <ChangeChip value={stock.changePercent} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 mt-4 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Cap:</span>
                    <span className="tabular-nums font-bold text-foreground">
                      {formatCompact(stock.marketCap * 1_000_000_000)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P/E Ratio:</span>
                    <span className="tabular-nums font-bold text-foreground">
                      {stock.peRatio !== null ? stock.peRatio.toFixed(1) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Yield %:</span>
                    <span className="tabular-nums font-bold text-foreground">
                      {stock.dividendYield !== null ? `${stock.dividendYield.toFixed(2)}%` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beta (Risk):</span>
                    <span className="tabular-nums font-bold text-foreground">
                      {stock.beta !== null ? stock.beta.toFixed(2) : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2">
                <Button asChild variant="outline" size="sm" className="w-full rounded-xl hover:bg-primary hover:text-white transition-colors">
                  <Link href={`/stock/${stock.symbol}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
