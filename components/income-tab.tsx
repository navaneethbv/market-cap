"use client";

import { formatPrice } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateIncomeSummary, type IncomeMetric } from "@/lib/income";

export function IncomeTab({ metrics }: { metrics: IncomeMetric[] }) {
  const { annualIncome, portfolioYield, yieldOnCost } = calculateIncomeSummary(metrics);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Annual dividend income</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(annualIncome)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Portfolio yield</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {portfolioYield.toFixed(2)}%
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Yield on cost (YoC)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {yieldOnCost.toFixed(2)}%
          </p>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Estimates use each holding&apos;s current indicated annual dividend yield
        from Finnhub applied to your position value.
      </p>

      {/* Holdings List */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Dividend Assets</h3>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Dividend Yield</TableHead>
                <TableHead className="text-right">Est. Annual Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-4">
                    No positions found.
                  </TableCell>
                </TableRow>
              ) : (
                metrics.map((h) => {
                  const estAnnual = h.shares * h.price * (h.dividendYield / 100);
                  return (
                    <TableRow key={h.symbol}>
                      <TableCell className="font-semibold">{h.symbol}</TableCell>
                      <TableCell className="text-right tabular-nums">{h.shares}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPrice(h.price)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {h.dividendYield > 0 ? `${h.dividendYield.toFixed(2)}%` : "0%"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatPrice(estAnnual)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
