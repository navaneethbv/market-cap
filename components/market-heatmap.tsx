"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCompact, formatPrice } from "@/lib/format";
import { buildSectorHeatmapData } from "@/lib/heatmap";
import type { ScreenerStock } from "@/lib/screener";

export function MarketHeatmap({
  stocks,
}: Readonly<{
  stocks: readonly ScreenerStock[];
}>) {
  const [selectedSector, setSelectedSector] = useState<string>("All");

  const sectorGroups = useMemo(() => {
    return buildSectorHeatmapData(stocks);
  }, [stocks]);

  const displayedGroups = useMemo(() => {
    if (selectedSector === "All") return sectorGroups;
    return sectorGroups.filter((g) => g.sector === selectedSector);
  }, [sectorGroups, selectedSector]);

  const sectors = useMemo(() => {
    return ["All", ...sectorGroups.map((g) => g.sector)];
  }, [sectorGroups]);

  return (
    <div className="space-y-6">
      {/* Sector filter pills */}
      <div className="flex flex-wrap gap-1.5 bg-card p-2 rounded-2xl border shadow-xs">
        {sectors.map((sec) => {
          const isSelected = sec === selectedSector;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => setSelectedSector(sec)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {sec}
            </button>
          );
        })}
      </div>

      {/* Heatmap Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {displayedGroups.map((group) => (
          <div
            key={group.sector}
            className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col justify-between space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{group.sector}</span>
                <span className="text-[11px] text-muted-foreground">
                  ({formatCompact(group.totalMarketCap * 1_000_000_000)})
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                  group.weightedChangePercent >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {group.weightedChangePercent >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {group.weightedChangePercent >= 0 ? "+" : ""}
                {group.weightedChangePercent}%
              </span>
            </div>

            {/* Stocks Tiles Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {group.stocks.map((stock) => (
                <Link
                  key={stock.symbol}
                  href={`/stock/${stock.symbol}`}
                  style={{ backgroundColor: stock.color }}
                  className="group relative flex flex-col justify-between rounded-xl p-2.5 text-white shadow-xs transition hover:scale-[1.03] hover:shadow-md min-h-[75px]"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-extrabold text-sm drop-shadow-xs">
                      {stock.symbol}
                    </span>
                    <span className="text-[11px] font-bold font-mono opacity-90">
                      {stock.changePercent >= 0 ? "+" : ""}
                      {stock.changePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-end justify-between text-[11px] opacity-90">
                    <span className="truncate max-w-[70px] text-[10px]">
                      {formatCompact(stock.marketCap * 1_000_000_000)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatPrice(stock.price)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
