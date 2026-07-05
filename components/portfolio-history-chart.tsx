"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
} from "recharts";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioHistoryPoint } from "@/lib/portfolio-history";

type PortfolioHistoryRange = "1M" | "6M" | "1Y" | "5Y";
const RANGES: { value: PortfolioHistoryRange; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "5Y", label: "5Y" },
];

function formatTick(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PortfolioHistoryChart() {
  const [range, setRange] = useState<PortfolioHistoryRange>("1M");
  const [history, setHistory] = useState<PortfolioHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadHistory() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ range });
        const res = await fetch(`/api/portfolio/history?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("Failed to load portfolio performance data");
        }
        const data = (await res.json()) as { history: PortfolioHistoryPoint[] };
        if (active) {
          setHistory(data.history ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted && active) {
          setError(err instanceof Error ? err.message : "Performance chart unavailable");
          setHistory([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
      controller.abort();
    };
  }, [range]);

  // Compute returns based on first and last points in the active history array
  const hasData = history.length > 0;
  const firstPoint = hasData ? history[0] : null;
  const lastPoint = hasData ? history[history.length - 1] : null;

  const currentValuation = lastPoint ? lastPoint.value : 0;
  const initialValuation = firstPoint ? firstPoint.value : 0;
  const dollarChange = lastPoint && firstPoint ? lastPoint.value - firstPoint.value : 0;
  const percentChange = initialValuation === 0 ? 0 : (dollarChange / initialValuation) * 100;

  const tone = dollarChange >= 0 ? "up" : "down";
  const stroke = tone === "up" ? "rgb(16 185 129)" : "rgb(239 68 68)";
  const gradientId = `portfolio-chart-${tone}`;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Performance history</h2>
          {hasData && !loading && !error ? (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight tabular-nums">
                {formatPrice(currentValuation)}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  tone === "up"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {dollarChange >= 0 ? "+" : ""}
                {formatPrice(dollarChange)} ({percentChange.toFixed(2)}%)
              </span>
              <span className="text-[10px] text-muted-foreground ml-1 uppercase">
                {range}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Portfolio balance over time</p>
          )}
        </div>
        <div className="grid grid-cols-4 rounded-full bg-muted p-1 max-w-[200px] w-full self-end">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setRange(item.value)}
              className={cn(
                "h-8 rounded-full px-1 text-xs font-semibold transition-colors",
                item.value === range
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[280px] overflow-hidden rounded-xl">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground p-4 text-center">
            {error}
          </div>
        ) : history.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground p-4 text-center">
            No portfolio performance history available. Add positions with past purchase dates to display trend charts.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={history}
              margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stroke} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.4}
              />
              <XAxis
                dataKey="time"
                tickFormatter={formatTick}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                domain={["dataMin - 100", "dataMax + 100"]}
                orientation="right"
                tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke, strokeDasharray: "4 4" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const value = Number(payload[0].value);
                  const costBasis = Number(payload[1]?.value ?? 0);
                  const pl = value - costBasis;
                  const plPercent = costBasis === 0 ? 0 : (pl / costBasis) * 100;
                  const isPlPositive = pl >= 0;

                  return (
                    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg space-y-1">
                      <div className="font-semibold text-foreground">
                        Value: {formatPrice(value)}
                      </div>
                      <div className="text-muted-foreground">
                        Cost Basis: {formatPrice(costBasis)}
                      </div>
                      <div
                        className={cn(
                          "font-semibold",
                          isPlPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        P/L: {isPlPositive ? "+" : ""}
                        {formatPrice(pl)} ({plPercent.toFixed(2)}%)
                      </div>
                      <div className="text-[10px] text-muted-foreground pt-0.5 border-t">
                        {formatTick(String(label))}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
              />
              <Line
                type="monotone"
                dataKey="costBasis"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
