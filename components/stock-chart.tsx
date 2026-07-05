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
} from "recharts";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getChartTone } from "@/lib/stock-display";
import type { Candle, ChartRange } from "@/lib/market/types";

const RANGES: ChartRange[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

function formatTick(value: string, range: ChartRange): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (range === "1D") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
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

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<ChartRange>("1D");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadCandles() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ symbol, range });
        const res = await fetch(`/api/candles?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("Failed to load chart data");
        }
        const data = (await res.json()) as { candles: Candle[] };
        if (active) {
          setCandles(data.candles ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted && active) {
          setError(err instanceof Error ? err.message : "Chart unavailable");
          setCandles([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCandles();

    return () => {
      active = false;
      controller.abort();
    };
  }, [symbol, range]);

  const tone = getChartTone(candles);
  const stroke = tone === "up" ? "rgb(16 185 129)" : "rgb(239 68 68)";
  const gradientId = `stock-chart-${tone}`;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Price chart</h2>
          <p className="text-sm text-muted-foreground">{symbol} candles</p>
        </div>
        <div className="grid grid-cols-6 rounded-full bg-muted p-1">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={cn(
                "h-8 rounded-full px-2 text-xs font-semibold tabular-nums transition-colors",
                item === range
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[320px] overflow-hidden rounded-xl">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            {error}
          </div>
        ) : candles.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No chart data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={candles}
              margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={stroke} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="time"
                tickFormatter={(value) => formatTick(value, range)}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                domain={["dataMin", "dataMax"]}
                orientation="right"
                tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke, strokeDasharray: "4 4" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const close = Number(payload[0].value);
                  return (
                    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
                      <div className="font-semibold text-foreground">
                        {formatPrice(close)}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {formatTick(String(label), range)}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={stroke}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
