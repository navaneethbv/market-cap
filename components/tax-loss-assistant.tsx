"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Coins,
  Info,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { evaluateTaxLossHarvesting } from "@/lib/tax-harvesting";
import type { HoldingRow } from "@/lib/portfolio";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TaxLossAssistant({
  holdings,
}: Readonly<{
  holdings: readonly HoldingRow[];
}>) {
  const [taxRate, setTaxRate] = useState<number>(15);

  const harvestData = useMemo(() => {
    return evaluateTaxLossHarvesting(holdings, taxRate);
  }, [holdings, taxRate]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Total Unrealized Losses
          </span>
          <span className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-1 block">
            -${harvestData.totalUnrealizedLoss.toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Across {harvestData.candidateCount} loss-bearing holding{harvestData.candidateCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-emerald-500" />
            Estimated Tax Savings
          </span>
          <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
            +${harvestData.estimatedTaxSavings.toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            At {taxRate}% estimated capital gains rate
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">
              Tax Bracket Rate
            </span>
            <span className="text-xs font-bold font-mono text-primary">
              {taxRate}%
            </span>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-xl text-xs font-semibold">
            {[15, 20, 24, 37].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setTaxRate(rate)}
                className={`flex-1 py-1 rounded-lg transition ${
                  taxRate === rate
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Wash Sale Educational Banner */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          IRS 30-Day Wash Sale Rule Guidance
        </div>
        <p className="leading-relaxed pl-6">
          To claim capital loss tax deductions, avoid purchasing &ldquo;substantially identical&rdquo;
          shares within 30 days before or after the sale date. Use the suggested sector ETFs below
          to maintain market exposure without triggering a wash sale.
        </p>
      </div>

      {/* Candidates Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold">Harvesting Opportunities</h2>
          <p className="text-xs text-muted-foreground">
            Positions currently trading below your cost basis
          </p>
        </div>

        {harvestData.candidates.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            No unrealized loss positions found. Your portfolio is entirely profitable!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holding</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Unrealized Loss</TableHead>
                <TableHead className="text-right">Est. Tax Savings</TableHead>
                <TableHead>Recommended Substitutes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {harvestData.candidates.map((c) => {
                const itemSavings = Number((c.unrealizedLoss * (taxRate / 100)).toFixed(2));
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold">
                      <Link href={`/stock/${c.symbol}`} className="hover:underline text-primary">
                        {c.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.shares}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(c.avgCost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(c.currentPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-red-600 dark:text-red-400">
                      -${c.unrealizedLoss.toFixed(2)} ({c.lossPercent}%)
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      +${itemSavings.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.replacementEtfs.map((etf) => (
                          <Link
                            key={etf}
                            href={`/stock/${etf}`}
                            className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                          >
                            {etf}
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
