"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { formatPrice } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateIncomeSummary, type IncomeMetric, getDividendGrowth, calculateChowderScore } from "@/lib/income";

export function IncomeTab({ metrics }: { metrics: IncomeMetric[] }) {
  const { annualIncome, portfolioYield, yieldOnCost } = calculateIncomeSummary(metrics);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyPayouts = Array(12).fill(0);

  // Compile scatter points
  const scatterPoints = metrics
    .filter((h) => h.dividendYield > 0)
    .map((h) => {
      const growth = getDividendGrowth(h.symbol);
      const chowder = calculateChowderScore(h.dividendYield, growth);
      return {
        symbol: h.symbol,
        yield: h.dividendYield,
        growth,
        chowder,
        value: h.shares * h.price,
      };
    });

  for (const h of metrics) {
    if (h.dividendYield <= 0) continue;
    const annualPayout = h.shares * h.price * (h.dividendYield / 100);
    const quarterlyPayout = annualPayout / 4;

    const code = (h.symbol.charCodeAt(0) + (h.symbol.charCodeAt(1) || 0)) % 3;
    let payoutMonths = [0, 3, 6, 9];
    if (code === 1) {
      payoutMonths = [1, 4, 7, 10];
    } else if (code === 2) {
      payoutMonths = [2, 5, 8, 11];
    }

    for (const m of payoutMonths) {
      monthlyPayouts[m] += quarterlyPayout;
    }
  }

  const chartData = months.map((month, idx) => ({
    month,
    payout: monthlyPayouts[idx],
  }));

  const hasIncome = annualIncome > 0;

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

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Payout Calendar Bar Chart */}
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Estimated monthly payouts</h2>
            <p className="text-sm text-muted-foreground">Projected cash flows over the next 12 months</p>
          </div>
          <div className="h-[240px] w-full">
            {!hasIncome ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No dividend-paying assets in your portfolio.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    orientation="right"
                    tickFormatter={(val) => `$${val}`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const val = Number(payload[0].value);
                      return (
                        <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
                          <span className="font-semibold text-foreground">
                            Payout: {formatPrice(val)}
                          </span>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="payout" fill="rgb(139, 92, 246)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Chowder Scatter Matrix */}
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Dividend Chowder Matrix</h2>
            <p className="text-sm text-muted-foreground">Yield % (X) vs. 5Y Dividend Growth % (Y)</p>
          </div>
          <div className="h-[240px] w-full">
            {scatterPoints.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No active dividend growth assets to map.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    type="number"
                    dataKey="yield"
                    name="Dividend Yield"
                    unit="%"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="growth"
                    name="Dividend Growth"
                    unit="%"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <ZAxis type="number" dataKey="value" range={[50, 400]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border bg-popover p-3 text-xs shadow-lg space-y-1">
                          <div className="font-bold text-foreground">{data.symbol}</div>
                          <div className="text-muted-foreground flex justify-between gap-4">
                            <span>Yield:</span>
                            <span className="font-mono text-foreground">{data.yield.toFixed(2)}%</span>
                          </div>
                          <div className="text-muted-foreground flex justify-between gap-4">
                            <span>5Y Growth:</span>
                            <span className="font-mono text-foreground">{data.growth.toFixed(2)}%</span>
                          </div>
                          <div className="text-muted-foreground flex justify-between gap-4 border-t pt-1 font-semibold">
                            <span>Chowder Score:</span>
                            <span className="font-mono text-primary">{data.chowder.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterPoints} fill="rgb(139, 92, 246)" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

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
