"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, DollarSign, Trash2 } from "lucide-react";
import { ChangeChip } from "@/components/change-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice } from "@/lib/format";
import type { HoldingRow, PortfolioSummary } from "@/lib/portfolio";
import { AddHoldingDialog, EditHoldingDialog } from "@/components/holding-dialogs";
import { deleteHolding } from "@/app/portfolio/actions";
import { IncomeTab } from "@/components/income-tab";

interface PortfolioTabsProps {
  realRows: HoldingRow[];
  realSummary: PortfolioSummary;
  incomeMetrics: {
    symbol: string;
    shares: number;
    price: number;
    avgCost: number;
    dividendYield: number;
  }[];
}

export function PortfolioTabs({
  realRows,
  realSummary,
  incomeMetrics,
}: PortfolioTabsProps) {
  const [activeTab, setActiveTab] = useState<"real" | "income">("real");

  function summaryTone(value: number) {
    return value >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  }

  return (
    <div className="space-y-6">
      {/* Tabs Selector Navigation */}
      <div className="flex border-b border-border items-center justify-between flex-wrap gap-3 pb-px">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("real")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "real"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Holdings
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "income"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Dividend Income
          </button>
        </div>

        {activeTab === "real" && <AddHoldingDialog />}
      </div>

      {/* 1. Holdings Tab */}
      {activeTab === "real" && (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Market value</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {formatPrice(realSummary.marketValue)}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Cost basis</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {formatPrice(realSummary.costBasis)}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">P/L</p>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${summaryTone(realSummary.profitLoss)}`}>
                {realSummary.profitLoss >= 0 ? "+" : ""}
                {formatPrice(realSummary.profitLoss)}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Return</p>
              <div className="mt-2">
                <ChangeChip value={realSummary.profitLossPercent} />
              </div>
            </div>
          </section>

          {realRows.length === 0 ? (
            <section className="rounded-2xl border bg-card p-8 text-center shadow-sm">
              <h2 className="text-base font-semibold">No holdings yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Add your first stock position to start tracking performance.
              </p>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Avg cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Value</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={`/stock/${row.symbol}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {row.symbol}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">Bought {row.purchasedAt}</p>
                        {row.error && (
                          <p className="mt-1 text-xs text-muted-foreground">{row.error}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.shares, 4)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPrice(row.avgCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.quote ? formatPrice(row.quote.price) : "-"}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {row.marketValue === null ? "-" : formatPrice(row.marketValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.profitLoss === null || row.profitLossPercent === null ? (
                          <span className="text-sm text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-sm font-semibold tabular-nums ${summaryTone(row.profitLoss)}`}>
                              {row.profitLoss >= 0 ? "+" : ""}
                              {formatPrice(row.profitLoss)}
                            </span>
                            <ChangeChip value={row.profitLossPercent} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <EditHoldingDialog holding={row} />
                          <form action={deleteHolding}>
                            <input type="hidden" name="id" value={row.id} />
                            <Button type="submit" variant="ghost" size="icon-sm" aria-label={`Delete ${row.symbol}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}
        </div>
      )}

      {/* 2. Dividend Income Tab */}
      {activeTab === "income" && <IncomeTab metrics={incomeMetrics} />}
    </div>
  );
}
