"use client";

import { useState } from "react";
import {
  TrendingUp,
  Sliders,
  Loader2,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, formatNumber } from "@/lib/format";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { BacktestResult, StrategyType } from "@/lib/backtester";

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [strategy, setStrategy] = useState<StrategyType>("sma_crossover");
  const [initialCapital, setInitialCapital] = useState("10000");

  const [smaShort, setSmaShort] = useState("20");
  const [smaLong, setSmaLong] = useState("50");
  const [rsiPeriod, setRsiPeriod] = useState("14");
  const [rsiOversold, setRsiOversold] = useState("30");
  const [rsiOverbought, setRsiOverbought] = useState("70");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;

    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({
      symbol,
      strategy,
      initialCapital,
      smaShort,
      smaLong,
      rsiPeriod,
      rsiOversold,
      rsiOverbought,
    });

    try {
      const res = await fetch(`/api/backtest?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to calculate backtest");
      }
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error executing strategy backtest");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategy Backtesting Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simulate standard technical strategies over 1 year of daily historical prices to benchmark returns.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Controls Panel */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleRunBacktest}
            className="rounded-2xl border bg-card p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2 font-medium text-sm text-muted-foreground border-b pb-2">
              <Sliders className="h-4 w-4" />
              <span>Simulation Controls</span>
            </div>

            {/* Symbol & Capital */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ticker Symbol</label>
                <Input
                  className="rounded-xl uppercase"
                  placeholder="AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Starting Capital ($)</label>
                <Input
                  type="number"
                  className="rounded-xl"
                  placeholder="10000"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Strategy Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Strategy Type</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyType)}
                className="border-input bg-background focus-visible:ring-ring flex h-10 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="sma_crossover">SMA Crossover (Golden/Death Cross)</option>
                <option value="rsi_threshold">RSI Boundary Threshold</option>
              </select>
            </div>

            {/* Strategy Specific Sliders */}
            {strategy === "sma_crossover" ? (
              <div className="space-y-4 border-t pt-3.5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Fast SMA Period (Short)</span>
                    <span>{smaShort} days</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={smaShort}
                    onChange={(e) => setSmaShort(e.target.value)}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Slow SMA Period (Long)</span>
                    <span>{smaLong} days</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="1"
                    value={smaLong}
                    onChange={(e) => setSmaLong(e.target.value)}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 border-t pt-3.5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">RSI Lookback Period</span>
                    <span>{rsiPeriod} days</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    step="1"
                    value={rsiPeriod}
                    onChange={(e) => setRsiPeriod(e.target.value)}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Oversold Threshold (Buy)</span>
                    <span>{rsiOversold}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="1"
                    value={rsiOversold}
                    onChange={(e) => setRsiOversold(e.target.value)}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Overbought Threshold (Sell)</span>
                    <span>{rsiOverbought}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    step="1"
                    value={rsiOverbought}
                    onChange={(e) => setRsiOverbought(e.target.value)}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl flex items-center justify-center gap-1.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Running Simulation...</span>
                </>
              ) : (
                <span>Run Backtest</span>
              )}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50/10 text-red-400 text-sm flex items-start gap-2.5">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Metric Cards Grid */}
              <div className="grid gap-3.5 grid-cols-2 md:grid-cols-4">
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">Strategy Return</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold">{formatNumber(result.totalReturn)}%</span>
                    <span className="text-xs text-muted-foreground">tot</span>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">Buy & Hold Return</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold">{formatNumber(result.buyAndHoldReturn)}%</span>
                    <span className="text-xs text-muted-foreground">tot</span>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">Max Drawdown</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold text-red-500">{formatNumber(result.maxDrawdown)}%</span>
                    <span className="text-xs text-muted-foreground">drop</span>
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">Win Rate & Trades</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold">{formatNumber(result.winRate)}%</span>
                    <span className="text-xs text-muted-foreground">({result.tradeCount} trades)</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Equity Growth Comparison</span>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.points}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="time" tickFormatter={(t) => t.slice(5, 10)} tickMargin={6} style={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `$${v}`} style={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e1e2e", borderColor: "#313244", color: "#cdd6f4", borderRadius: "12px", fontSize: 12 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => [formatPrice(Number(value || 0)), ""]}
                      />
                      <Legend style={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="strategyValue"
                        name="Strategy Portfolio"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="buyAndHoldValue"
                        name="Buy & Hold Benchmark"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trade Log */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                    <Layers className="h-4 w-4" />
                    <span>Trade History Log</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {result.trades.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      No trades were executed by the strategy over this period.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b text-muted-foreground font-medium">
                          <th className="py-2">Date</th>
                          <th className="py-2">Type</th>
                          <th className="py-2 text-right">Price</th>
                          <th className="py-2 text-right">Shares</th>
                          <th className="py-2 text-right">Cash Left</th>
                          <th className="py-2 text-right">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((trade, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/30">
                            <td className="py-2.5 font-medium">{trade.time}</td>
                            <td className="py-2.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                                  trade.type === "buy"
                                    ? "bg-green-500/10 text-green-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {trade.type}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">{formatPrice(trade.price)}</td>
                            <td className="py-2.5 text-right font-medium">
                              {trade.shares > 0 ? trade.shares.toFixed(2) : "Liquidated"}
                            </td>
                            <td className="py-2.5 text-right text-muted-foreground">{formatPrice(trade.cash)}</td>
                            <td className="py-2.5 text-right font-semibold">{formatPrice(trade.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center space-y-3">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40 animate-pulse" />
              <h3 className="text-sm font-semibold">No Simulation Run</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Configure your starting ticker and strategy parameters on the left, then click run backtest.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
