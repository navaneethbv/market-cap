"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Scale, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateRebalancePlan,
  getEqualWeights,
  type RebalanceInputHolding,
} from "@/lib/rebalancer";
import { formatNumber, formatPrice } from "@/lib/format";

export function RebalanceCalculator({
  holdings,
}: Readonly<{
  holdings: readonly RebalanceInputHolding[];
}>) {
  const symbols = useMemo(() => holdings.map((h) => h.symbol), [holdings]);
  const initialWeights = useMemo(() => getEqualWeights(symbols), [symbols]);

  const [targetWeights, setTargetWeights] =
    useState<Record<string, number>>(initialWeights);
  const [extraCash, setExtraCash] = useState<number>(0);

  const plan = useMemo(
    () => calculateRebalancePlan(holdings, targetWeights, extraCash),
    [holdings, targetWeights, extraCash]
  );

  const totalWeight = Math.round(plan.totalTargetWeight * 100) / 100;
  const isWeightValid = Math.abs(totalWeight - 100) < 0.1;

  function updateWeight(symbol: string, val: number) {
    setTargetWeights((prev) => ({
      ...prev,
      [symbol]: Math.max(0, Math.min(100, Number(val) || 0)),
    }));
  }

  function handleSetEqualWeights() {
    setTargetWeights(getEqualWeights(symbols));
  }

  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <Scale className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 text-base font-semibold">No holdings to rebalance</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Add stocks to your portfolio first before using the rebalancer.
        </p>
        <Button asChild className="mt-4 rounded-full" size="sm">
          <Link href="/portfolio">Go to Portfolio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Strip */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Target Allocation Targets</h2>
            <p className="text-xs text-muted-foreground">
              Adjust position target weights to generate rebalancing trades.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSetEqualWeights}
              className="rounded-full text-xs flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Equal Weight ({(100 / symbols.length).toFixed(1)}%)
            </Button>
          </div>
        </div>

        {/* Extra cash input */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="extra-cash" className="font-semibold text-muted-foreground">
              New Cash Contribution ($):
            </label>
            <input
              id="extra-cash"
              type="number"
              min="0"
              step="100"
              value={extraCash || ""}
              onChange={(e) => setExtraCash(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0.00"
              className="w-28 rounded-lg border bg-background px-3 py-1 text-xs font-mono"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 font-medium">
            <span>Total Target Weight:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold font-mono ${
                isWeightValid
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {totalWeight}%
            </span>
          </div>
        </div>

        {!isWeightValid && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Target weights must total 100% (currently {totalWeight}%). Adjust the sliders or inputs below.
            </span>
          </div>
        )}
      </section>

      {/* Target Allocation Adjuster */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {holdings.map((h) => {
          const currentWeight =
            plan.totalCurrentValue > 0
              ? ((h.shares * h.price) / plan.totalCurrentValue) * 100
              : 0;
          const targetWeight = targetWeights[h.symbol] ?? 0;
          return (
            <div key={h.symbol} className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base">{h.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  Current: {currentWeight.toFixed(1)}% ({formatPrice(h.shares * h.price)})
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>Target Weight</span>
                  <span className="font-mono font-bold text-primary">{targetWeight}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={targetWeight}
                    onChange={(e) => updateWeight(h.symbol, Number(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                    aria-label={`Target weight slider for ${h.symbol}`}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={targetWeight}
                    onChange={(e) => updateWeight(h.symbol, Number(e.target.value))}
                    className="w-14 rounded border bg-background px-1.5 py-0.5 text-right font-mono text-xs"
                    aria-label={`Target weight for ${h.symbol}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Rebalancing Action Plan Table */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">Rebalance Action Plan</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Execute these exact buy and sell trades to reach your target asset allocation.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Current Value</TableHead>
              <TableHead className="text-right">Target Value</TableHead>
              <TableHead className="text-right">Weight Delta</TableHead>
              <TableHead className="text-right">Action / Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.rows.map((row) => {
              const weightDelta = row.targetWeightPercent - row.currentWeightPercent;
              return (
                <TableRow key={row.symbol}>
                  <TableCell className="font-bold">{row.symbol}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(row.currentPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(row.currentValue)} ({row.currentShares} sh)
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatPrice(row.targetValue)} ({formatNumber(row.targetShares, 2)} sh)
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    <span
                      className={
                        weightDelta >= 0
                          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "text-red-600 dark:text-red-400 font-semibold"
                      }
                    >
                      {weightDelta >= 0 ? "+" : ""}
                      {weightDelta.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.action === "BUY" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        BUY +{formatNumber(row.deltaShares, 2)} sh ({formatPrice(row.deltaValue)})
                      </span>
                    )}
                    {row.action === "SELL" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                        SELL {formatNumber(Math.abs(row.deltaShares), 2)} sh ({formatPrice(Math.abs(row.deltaValue))})
                      </span>
                    )}
                    {row.action === "HOLD" && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        BALANCED
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {plan.isBalanced && (
          <div className="p-4 text-center text-xs text-muted-foreground border-t">
            🎉 Your portfolio is already balanced according to your target allocation!
          </div>
        )}
      </section>
    </div>
  );
}
