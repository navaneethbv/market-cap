"use client";

import { useEffect, useMemo, useState } from "react";
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
  BarChart,
} from "recharts";
import { Loader2, Settings, BarChart2, TrendingUp, CandlestickChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, formatCompact } from "@/lib/format";
import { getChartTone } from "@/lib/stock-display";
import { calculateIndicators, type IndicatorOptions } from "@/lib/market/indicators";
import type { Candle, ChartRange } from "@/lib/market/types";

const RANGES: ChartRange[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];
type ChartType = "area" | "candlestick" | "line";

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

interface TooltipPayloadItem {
  value?: number | string | null;
  name?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

function MainChartTooltip({
  active,
  payload,
  label,
  range,
  chartType,
}: Readonly<{
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  range: ChartRange;
  chartType: ChartType;
}>) {
  if (!active || !payload?.length) return null;
  const candlePayload = payload[0]?.payload as (Candle & Record<string, unknown>) | undefined;
  const close = Number(candlePayload?.close ?? payload.find((p) => p.dataKey === "close")?.value ?? 0);
  const open = candlePayload?.open;
  const high = candlePayload?.high;
  const low = candlePayload?.low;
  const volume = candlePayload?.volume;

  const s50 = payload.find((p) => p.dataKey === "sma50")?.value;
  const s200 = payload.find((p) => p.dataKey === "sma200")?.value;
  const e20 = payload.find((p) => p.dataKey === "ema20")?.value;
  const bUpper = payload.find((p) => p.dataKey === "bbUpper")?.value;
  const bLower = payload.find((p) => p.dataKey === "bbLower")?.value;

  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg space-y-1">
      <div className="font-semibold text-foreground">
        Close: {formatPrice(close)}
      </div>
      {chartType === "candlestick" && open !== undefined && high !== undefined && low !== undefined && (
        <div className="grid grid-cols-2 gap-x-2 text-[11px] text-muted-foreground pt-0.5 border-t">
          <span>Open: {formatPrice(open)}</span>
          <span>High: {formatPrice(high)}</span>
          <span>Low: {formatPrice(low)}</span>
          {volume ? <span>Vol: {formatCompact(volume)}</span> : null}
        </div>
      )}
      {s50 !== undefined && s50 !== null && (
        <div className="text-amber-600 dark:text-amber-400 font-medium">
          SMA 1: {formatPrice(Number(s50))}
        </div>
      )}
      {s200 !== undefined && s200 !== null && (
        <div className="text-blue-600 dark:text-blue-400 font-medium">
          SMA 2: {formatPrice(Number(s200))}
        </div>
      )}
      {e20 !== undefined && e20 !== null && (
        <div className="text-pink-600 dark:text-pink-400 font-medium">
          EMA: {formatPrice(Number(e20))}
        </div>
      )}
      {bUpper !== undefined && bUpper !== null && bLower !== undefined && bLower !== null && (
        <div className="text-purple-600 dark:text-purple-400 font-medium">
          BB: [{formatPrice(Number(bLower))} - {formatPrice(Number(bUpper))}]
        </div>
      )}
      <div className="text-[10px] text-muted-foreground pt-0.5 border-t">
        {formatTick(String(label), range)}
      </div>
    </div>
  );
}

function VolumeTooltip({ active, payload }: Readonly<{ active?: boolean; payload?: TooltipPayloadItem[] }>) {
  if (!active || !payload?.length) return null;
  const vol = payload[0].value;
  return (
    <div className="rounded-lg border bg-popover px-2 py-1 text-[10px] shadow-md font-semibold text-foreground">
      Volume: {vol !== undefined && vol !== null ? formatCompact(Number(vol)) : "-"}
    </div>
  );
}

function RsiTooltip({ active, payload }: Readonly<{ active?: boolean; payload?: TooltipPayloadItem[] }>) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-lg border bg-popover px-2 py-1 text-[10px] shadow-md font-semibold text-foreground">
      RSI: {val !== undefined && val !== null ? Number(val).toFixed(2) : "-"}
    </div>
  );
}

function MacdTooltip({ active, payload }: Readonly<{ active?: boolean; payload?: TooltipPayloadItem[] }>) {
  if (!active || !payload?.length) return null;
  const line = payload.find((p) => p.dataKey === "macdLine")?.value;
  const sig = payload.find((p) => p.dataKey === "signalLine")?.value;
  const hist = payload.find((p) => p.dataKey === "macdHist")?.value;
  return (
    <div className="rounded-lg border bg-popover px-2 py-1 text-[10px] shadow-md space-y-0.5 text-foreground">
      <div className="font-semibold">MACD: {line !== undefined && line !== null ? Number(line).toFixed(3) : "-"}</div>
      <div className="text-amber-500 font-semibold">Signal: {sig !== undefined && sig !== null ? Number(sig).toFixed(3) : "-"}</div>
      <div className="text-indigo-500 font-semibold">Hist: {hist !== undefined && hist !== null ? Number(hist).toFixed(3) : "-"}</div>
    </div>
  );
}

interface CustomCandleBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Candle & { isUp?: boolean };
}

function CandlestickBar(props: Readonly<CustomCandleBarProps>) {
  const { x = 0, y = 0, width = 6, height = 0, payload } = props;
  if (!payload) return null;

  const { open, high, low, close } = payload;
  const isUp = close >= open;
  const color = isUp ? "rgb(16 185 129)" : "rgb(239 68 68)";
  const bodyHeight = Math.max(height, 2);
  const candleWidth = Math.max(Math.min(width * 0.75, 12), 2);
  const centerX = x + width / 2;

  // Calculate wick scale
  const bodyRange = Math.max(Math.abs(close - open), 0.0001);
  const pxPerDollar = bodyHeight / bodyRange;

  const upperWickHeight = Math.max((high - Math.max(open, close)) * pxPerDollar, 0);
  const lowerWickHeight = Math.max((Math.min(open, close) - low) * pxPerDollar, 0);

  const wickTop = y - upperWickHeight;
  const wickBottom = y + bodyHeight + lowerWickHeight;

  return (
    <g>
      {/* High-Low Wick */}
      <line
        x1={centerX}
        y1={wickTop}
        x2={centerX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Open-Close Body */}
      <rect
        x={centerX - candleWidth / 2}
        y={y}
        width={candleWidth}
        height={bodyHeight}
        fill={color}
        rx={1}
      />
    </g>
  );
}

export function StockChart({ symbol }: Readonly<{ symbol: string }>) {
  const [range, setRange] = useState<ChartRange>("1D");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Indicator toggles
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Indicator period configs
  const [indicatorOptions, setIndicatorOptions] = useState<IndicatorOptions>({
    sma50Period: 50,
    sma200Period: 200,
    ema20Period: 20,
    bbPeriod: 20,
    bbMultiplier: 2,
    rsiPeriod: 14,
  });

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

  const chartData = useMemo(() => {
    const indicators = calculateIndicators(candles, indicatorOptions);
    return candles.map((candle, idx) => ({
      ...candle,
      candleBody: [Math.min(candle.open, candle.close), Math.max(candle.open, candle.close)],
      isUp: candle.close >= candle.open,
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
  }, [candles, indicatorOptions]);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 space-y-4">
      {/* Header controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Price chart</h2>
          <p className="text-sm text-muted-foreground">{symbol} candles</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Selector */}
          <div className="flex rounded-full bg-muted p-1">
            <button
              type="button"
              onClick={() => setChartType("area")}
              className={cn(
                "flex items-center gap-1 h-7 rounded-full px-2.5 text-xs font-semibold transition-colors",
                chartType === "area"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Area Chart"
            >
              <TrendingUp className="h-3 w-3" /> Area
            </button>
            <button
              type="button"
              onClick={() => setChartType("candlestick")}
              className={cn(
                "flex items-center gap-1 h-7 rounded-full px-2.5 text-xs font-semibold transition-colors",
                chartType === "candlestick"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Candlestick Chart"
            >
              <CandlestickChart className="h-3 w-3" /> Candles
            </button>
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={cn(
                "h-7 rounded-full px-2.5 text-xs font-semibold transition-colors",
                chartType === "line"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Line Chart"
            >
              Line
            </button>
          </div>

          {/* Time Ranges */}
          <div className="grid grid-cols-6 rounded-full bg-muted p-1">
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={cn(
                  "h-7 rounded-full px-2 text-xs font-semibold tabular-nums transition-colors",
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
      </div>

      {/* Indicators Control Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between text-xs border-y py-2.5">
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
            SMA {indicatorOptions.sma50Period}
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
            SMA {indicatorOptions.sma200Period}
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
            EMA {indicatorOptions.ema20Period}
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
            Bollinger ({indicatorOptions.bbPeriod})
          </button>
          <button
            type="button"
            onClick={() => setShowVolume(!showVolume)}
            className={cn(
              "px-2.5 py-1 rounded-full border transition-colors font-medium flex items-center gap-1",
              showVolume
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            <BarChart2 className="h-3 w-3" /> Volume
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <span className="font-semibold text-muted-foreground">Oscillators:</span>
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
            RSI ({indicatorOptions.rsiPeriod})
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
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-1 rounded-full border transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
              showSettings && "bg-accent text-accent-foreground"
            )}
            title="Configure indicator periods"
            aria-label="Indicator Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Indicator Configuration Drawer */}
      {showSettings && (
        <div className="rounded-xl border bg-muted/30 p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in-0">
          <div>
            <label htmlFor="input-sma50" className="text-muted-foreground block mb-1 font-medium">SMA 1 Period</label>
            <input
              id="input-sma50"
              type="number"
              min={2}
              max={500}
              value={indicatorOptions.sma50Period ?? 50}
              onChange={(e) =>
                setIndicatorOptions((prev) => ({
                  ...prev,
                  sma50Period: Number(e.target.value) || 50,
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label htmlFor="input-sma200" className="text-muted-foreground block mb-1 font-medium">SMA 2 Period</label>
            <input
              id="input-sma200"
              type="number"
              min={2}
              max={500}
              value={indicatorOptions.sma200Period ?? 200}
              onChange={(e) =>
                setIndicatorOptions((prev) => ({
                  ...prev,
                  sma200Period: Number(e.target.value) || 200,
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label htmlFor="input-ema20" className="text-muted-foreground block mb-1 font-medium">EMA Period</label>
            <input
              id="input-ema20"
              type="number"
              min={2}
              max={500}
              value={indicatorOptions.ema20Period ?? 20}
              onChange={(e) =>
                setIndicatorOptions((prev) => ({
                  ...prev,
                  ema20Period: Number(e.target.value) || 20,
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label htmlFor="input-rsi" className="text-muted-foreground block mb-1 font-medium">RSI Period</label>
            <input
              id="input-rsi"
              type="number"
              min={2}
              max={100}
              value={indicatorOptions.rsiPeriod ?? 14}
              onChange={(e) =>
                setIndicatorOptions((prev) => ({
                  ...prev,
                  rsiPeriod: Number(e.target.value) || 14,
                }))
              }
              className="w-full rounded-md border bg-background px-2 py-1 text-xs"
            />
          </div>
        </div>
      )}

      {/* Main Chart Canvas */}
      <div className="relative h-[320px] overflow-hidden rounded-xl">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {(() => {
          if (error) {
            return (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                {error}
              </div>
            );
          }
          if (candles.length === 0 && !loading) {
            return (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No chart data available.
              </div>
            );
          }
          return (
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
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
                  content={<MainChartTooltip range={range} chartType={chartType} />}
                />

                {/* Chart type renderers */}
                {chartType === "area" && (
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={stroke}
                    strokeWidth={2.5}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
                  />
                )}
                {chartType === "line" && (
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={stroke}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
                  />
                )}
                {chartType === "candlestick" && (
                  <Bar
                    dataKey="candleBody"
                    shape={<CandlestickBar />}
                    isAnimationActive={false}
                  />
                )}

                {/* Overlays */}
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
          );
        })()}
      </div>

      {/* Volume Sub-Chart Panel */}
      {!loading && !error && candles.length > 0 && showVolume && (
        <div className="h-[90px] rounded-xl border p-2 bg-muted/20 relative">
          <span className="absolute top-2 left-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Volume
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="time" hide />
              <YAxis
                orientation="right"
                width={48}
                tickFormatter={(val) => formatCompact(Number(val))}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <Tooltip cursor={{ fill: "transparent" }} content={<VolumeTooltip />} />
              <Bar dataKey="volume">
                {chartData.map((entry) => (
                  <Cell
                    key={entry.time}
                    fill={entry.isUp ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Secondary Oscillators */}
      {!loading && !error && candles.length > 0 && activeSubChart === "rsi" && (
        <div className="h-[120px] rounded-xl border p-2 bg-muted/20 relative">
          <span className="absolute top-2 left-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            RSI ({indicatorOptions.rsiPeriod})
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 8, left: 0, bottom: 5 }}>
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
                content={<RsiTooltip />}
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
            <ComposedChart data={chartData} margin={{ top: 15, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis dataKey="time" hide />
              <YAxis
                orientation="right"
                width={48}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <Tooltip
                cursor={{ stroke: "rgba(99, 102, 241, 0.4)", strokeDasharray: "4 4" }}
                content={<MacdTooltip />}
              />
              <Bar dataKey="macdHist">
                {chartData.map((entry) => (
                  <Cell
                    key={entry.time}
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
