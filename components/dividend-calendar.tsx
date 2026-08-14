"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, Calendar, Percent, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/format";
import {
  calculateMonthlyDividendForecast,
  type DividendForecastSummary,
} from "@/lib/dividend-forecast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DividendCalendar({
  holdings,
}: Readonly<{
  holdings: readonly {
    symbol: string;
    shares: number;
    avgCost: number;
    price: number;
    dividendYield: number | null;
  }[];
}>) {
  const forecast: DividendForecastSummary = useMemo(() => {
    return calculateMonthlyDividendForecast(holdings);
  }, [holdings]);

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Annual Dividend Income
          </span>
          <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
            ${forecast.totalAnnualIncome.toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Projected 12-month total
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-blue-500" />
            Monthly Average
          </span>
          <span className="text-2xl font-bold tabular-nums mt-1 block">
            ${forecast.monthlyAverage.toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Estimated passive cash flow
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <Percent className="h-4 w-4 text-primary" />
            Portfolio Current Yield
          </span>
          <span className="text-2xl font-bold tabular-nums mt-1 block">
            {forecast.currentYieldPercent}%
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Based on current market value
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Yield on Cost (YOC)
          </span>
          <span className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1 block">
            {forecast.yieldOnCostPercent}%
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Effective yield on initial capital
          </span>
        </div>
      </div>

      {/* Monthly Cash Flow Bar Chart */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">12-Month Projected Payout Schedule</h2>
            <p className="text-xs text-muted-foreground">
              Estimated dividend payments distributed across quarterly payment cycles
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            ${forecast.totalAnnualIncome.toFixed(2)} Total
          </span>
        </div>

        <div className="h-[260px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forecast.monthlyCashFlows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="monthName"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                formatter={(val) => [`$${Number(val).toFixed(2)}`, "Projected Payout"]}
                labelFormatter={(label) => `Month: ${label}`}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "0.75rem",
                  fontSize: "0.75rem",
                }}
              />
              <Bar
                dataKey="projectedIncome"
                fill="rgb(16, 185, 129)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Holdings Dividend Breakdown Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold">Holdings Income Breakdown</h2>
          <p className="text-xs text-muted-foreground">
            Annual income contribution sorted by highest paying assets
          </p>
        </div>

        {forecast.holdings.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No holdings found in your portfolio.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead className="text-right">Div Yield</TableHead>
                <TableHead className="text-right">Annual Income</TableHead>
                <TableHead className="text-right">Yield on Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecast.holdings.map((h) => (
                <TableRow key={h.symbol}>
                  <TableCell className="font-bold">
                    <Link href={`/stock/${h.symbol}`} className="hover:underline text-primary">
                      {h.symbol}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{h.shares}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(h.marketValue)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {h.dividendYield > 0 ? `${h.dividendYield.toFixed(2)}%` : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    {h.annualIncome > 0 ? `$${h.annualIncome.toFixed(2)}` : "$0.00"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    {h.yieldOnCost > 0 ? `${h.yieldOnCost.toFixed(2)}%` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
