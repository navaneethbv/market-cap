"use client";

import { useEffect, useState } from "react";
import {
  Area,
  ComposedChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  Cell,
  ReferenceLine,
  LineChart,
} from "recharts";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getChartTone } from "@/lib/stock-display";
import { calculateIndicators } from "@/lib/market/indicators";
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

  // Overlay states
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showBB, setShowBB] = useState(false);

  // Sub-chart state
  const [activeSubChart, setActiveSubChart] = useState<"none" | "rsi" | "macd">("none");

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

  // Calculate indicators
  const indicators = calculateIndicators(candles);

  // Merge indicator outputs with candles for Recharts
  const chartData = candles.map((candle, idx) => ({
    ...candle,
    sma50: indicators.sma50[idx],
    sma200: indicators.sma200[idx],
    ema20: indicators.ema20[idx],
    bbUpper: indicators.bollinger.upper[idx],
    bbMiddle: indicators.bollinger.middle[idx],
    bbLower: indicators.bollinger.lower[idx],
    rsi: indicators.rsi[idx],
    macdLine: indicators.macd.macdLine[idx],
    signalLine: indicators.macd.signalLine[idx],
    macdHist: indicators.macd.histogram[idx],
  }));

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Price chart</h2>
          <p className="text-sm text-muted-foreground">{symbol} candles</p>
        </div>
        <div className="grid grid-cols-6 rounded-full bg-muted p-1 max-w-sm">
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

      {/* Indicators Control Panel */}
      <div className="flex flex-wrap gap-4 items-center justify-between text-xs border-y py-2.5">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-semibold text-muted-foreground">Overlays:</span>
          <button
            type="button"
            onClick={() => setShowSMA50(!showSMA50)}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors font-medium",
              showSMA50
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            SMA 50
          </button>
          <button
            type="button"
            onClick={() => setShowSMA200(!showSMA200)}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors font-medium",
              showSMA200
                ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            SMA 200
          </button>
          <button
            type="button"
            onClick={() => setShowEMA20(!showEMA20)}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors font-medium",
              showEMA20
                ? "bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            EMA 20
          </button>
          <button
            type="button"
            onClick={() => setShowBB(!showBB)}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors font-medium",
              showBB
                ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            Bollinger Bands
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <span className="font-semibold text-muted-foreground">Indicators:</span>
          <button
            type="button"
            onClick={() => setActiveSubChart(activeSubChart === "rsi" ? "none" : "rsi")}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors font-medium",
              activeSubChart === "rsi"
                ? "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            RSI
          </button>
          <button
            type="button"
            onClick={() => setActiveSubChart(activeSubChart === "macd" ? "none" : "macd")}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors font-medium",
              activeSubChart === "macd"
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            MACD
          </button>
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
            <ComposedChart
              data={chartData}
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
                  const close = Number(payload.find(p => p.dataKey === "close")?.value ?? 0);
                  const s50 = payload.find(p => p.dataKey === "sma50")?.value;
                  const s200 = payload.find(p => p.dataKey === "sma200")?.value;
                  const e20 = payload.find(p => p.dataKey === "ema20")?.value;
                  const bUpper = payload.find(p => p.dataKey === "bbUpper")?.value;
                  const bLower = payload.find(p => p.dataKey === "bbLower")?.value;

                  return (
                    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg space-y-1">
                      <div className="font-semibold text-foreground">
                        Close: {formatPrice(close)}
                      </div>
                      {s50 !== undefined && s50 !== null && (
                        <div className="text-amber-600 dark:text-amber-400 font-medium">
                          SMA 50: {formatPrice(Number(s50))}
                        </div>
                      )}
                      {s200 !== undefined && s200 !== null && (
                        <div className="text-blue-600 dark:text-blue-400 font-medium">
                          SMA 200: {formatPrice(Number(s200))}
                        </div>
                      )}
                      {e20 !== undefined && e20 !== null && (
                        <div className="text-pink-600 dark:text-pink-400 font-medium">
                          EMA 20: {formatPrice(Number(e20))}
                        </div>
                      )}
                      {bUpper !== undefined && bUpper !== null && bLower !== undefined && bLower !== null && (
                        <div className="text-purple-600 dark:text-purple-400 font-medium">
                          Bands: {formatPrice(Number(bLower))} - {formatPrice(Number(bUpper))}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground pt-0.5 border-t">
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
              {showSMA50 && (
                <Line
                  type="monotone"
                  dataKey="sma50"
                  stroke="rgb(245, 158, 11)"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}
              {showSMA200 && (
                <Line
                  type="monotone"
                  dataKey="sma200"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}
              {showEMA20 && (
                <Line
                  type="monotone"
                  dataKey="ema20"
                  stroke="rgb(236, 72, 153)"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}
              {showBB && (
                <>
                  <Line
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="rgb(168, 85, 247)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bbMiddle"
                    stroke="rgba(168, 85, 247, 0.5)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="bbLower"
                    stroke="rgb(168, 85, 247)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Secondary Sub-Chart Panels */}
      {!loading && !error && candles.length > 0 && activeSubChart === "rsi" && (
        <div className="h-[120px] rounded-xl border p-2 bg-muted/20 relative">
          <span className="absolute top-2 left-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            RSI (14)
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 8, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="time" hide />
              <YAxis
                domain={[0, 100]}
                ticks={[30, 50, 70]}
                orientation="right"
                width={48}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <Tooltip
                cursor={{ stroke: "rgba(139, 92, 246, 0.4)", strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const val = payload[0].value;
                  return (
                    <div className="rounded-lg border bg-popover px-2 py-1 text-[10px] shadow-md font-semibold text-foreground">
                      RSI: {val !== null ? Number(val).toFixed(2) : "-"}
                    </div>
                  );
                }}
              />
              <ReferenceLine y={70} stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="3 3" />
              <ReferenceLine y={50} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="rgba(16, 185, 129, 0.4)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="rsi"
                stroke="rgb(139, 92, 246)"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && !error && candles.length > 0 && activeSubChart === "macd" && (
        <div className="h-[120px] rounded-xl border p-2 bg-muted/20 relative">
          <span className="absolute top-2 left-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            MACD (12, 26, 9)
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 8, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="time" hide />
              <YAxis
                orientation="right"
                width={48}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <Tooltip
                cursor={{ stroke: "rgba(99, 102, 241, 0.4)", strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const line = payload.find(p => p.dataKey === "macdLine")?.value;
                  const sig = payload.find(p => p.dataKey === "signalLine")?.value;
                  const hist = payload.find(p => p.dataKey === "macdHist")?.value;
                  return (
                    <div className="rounded-lg border bg-popover px-2 py-1 text-[10px] shadow-md space-y-0.5 text-foreground">
                      <div className="font-semibold">MACD: {line !== null ? Number(line).toFixed(3) : "-"}</div>
                      <div className="text-amber-500 font-semibold">Signal: {sig !== null ? Number(sig).toFixed(3) : "-"}</div>
                      <div className="text-indigo-500 font-semibold">Hist: {hist !== null ? Number(hist).toFixed(3) : "-"}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="macdHist">
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      (entry.macdHist ?? 0) >= 0
                        ? "rgba(16, 185, 129, 0.4)"
                        : "rgba(239, 68, 68, 0.4)"
                    }
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="macdLine"
                stroke="rgb(99, 102, 241)"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="signalLine"
                stroke="rgb(245, 158, 11)"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
