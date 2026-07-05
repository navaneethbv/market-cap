"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Layers,
  Search,
  Loader2,
  TrendingUp,
  Info,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import {
  ResponsiveContainer,
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ZAxis,
} from "recharts";
import { alignReturns, type AlignedReturnPoint } from "@/lib/correlation.ts";

export default function CorrelationPage() {
  const [symbolsInput, setSymbolsInput] = useState("AAPL,MSFT,GOOGL,AMZN,TSLA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbols, setSymbols] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, number | null>>>({});
  const [overlapCounts, setOverlapCounts] = useState<Record<string, Record<string, number>>>({});
  const [returns, setReturns] = useState<Record<string, { date: string; returnRate: number }[]>>({});

  const [selectedCell, setSelectedCell] = useState<{ symbolA: string; symbolB: string } | null>(null);

  const fetchCorrelation = async () => {
    if (!symbolsInput) return;
    setLoading(true);
    setError(null);
    setSelectedCell(null);

    try {
      const res = await fetch(`/api/correlation?symbols=${encodeURIComponent(symbolsInput)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to fetch correlation matrix");
      }
      setSymbols(data.symbols);
      setMatrix(data.matrix);
      setOverlapCounts(data.overlapCounts);
      setReturns(data.returns);

      if (data.symbols.length >= 2) {
        setSelectedCell({ symbolA: data.symbols[0], symbolB: data.symbols[1] });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error calculating correlations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCorrelation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHeatmapColor = (val: number | null) => {
    if (val === null) return "bg-zinc-800/40 text-muted-foreground";
    if (val >= 0.7) return "bg-green-600/80 text-white";
    if (val >= 0.4) return "bg-green-600/50 text-green-100";
    if (val >= 0.1) return "bg-green-600/20 text-green-300";
    if (val <= -0.7) return "bg-red-600/80 text-white";
    if (val <= -0.4) return "bg-red-600/50 text-red-100";
    if (val <= -0.1) return "bg-red-600/20 text-red-300";
    return "bg-zinc-800/90 text-zinc-300"; // Neutral correlation (close to 0)
  };

  const getAlignedPoints = (): AlignedReturnPoint[] => {
    if (!selectedCell || !returns[selectedCell.symbolA] || !returns[selectedCell.symbolB]) {
      return [];
    }
    const mapA = new Map(returns[selectedCell.symbolA].map((p) => [p.date, p.returnRate]));
    const mapB = new Map(returns[selectedCell.symbolB].map((p) => [p.date, p.returnRate]));
    return alignReturns(mapA, mapB);
  };

  const alignedPoints = getAlignedPoints();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Correlation Heatmap Matrix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze daily return correlations across 2 to 10 stock tickers to check for portfolio overlap and asset diversification.
        </p>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter symbols separated by commas (e.g. AAPL, MSFT, GOOGL)..."
              className="pl-9 rounded-xl uppercase"
              value={symbolsInput}
              onChange={(e) => setSymbolsInput(e.target.value)}
            />
          </div>
          <Button
            onClick={fetchCorrelation}
            disabled={loading}
            className="rounded-xl flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Matrix...</span>
              </>
            ) : (
              <span>Analyze Correlation</span>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/10 text-red-400 text-sm flex items-start gap-2.5">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {symbols.length > 0 && !loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Heatmap Matrix */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2 font-medium text-sm text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span>Pearson Correlation Coefficients</span>
            </div>

            <div className="overflow-auto max-w-full">
              <div
                className="grid gap-1 min-w-[320px]"
                style={{
                  gridTemplateColumns: `repeat(${symbols.length + 1}, minmax(50px, 1fr))`,
                }}
              >
                {/* Diagonal Header corner */}
                <div className="h-10 flex items-center justify-center text-xs font-semibold text-muted-foreground bg-muted/40 rounded-lg">
                  /
                </div>
                {/* Horizontal Header */}
                {symbols.map((symbol) => (
                  <div
                    key={symbol}
                    className="h-10 flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted/20 rounded-lg"
                  >
                    {symbol}
                  </div>
                ))}

                {/* Grid Rows */}
                {symbols.map((symbolA) => (
                  <Fragment key={symbolA}>
                    {/* Vertical Header cell */}
                    <div
                      key={`v-${symbolA}`}
                      className="h-10 flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted/20 rounded-lg"
                    >
                      {symbolA}
                    </div>

                    {/* Coefficients */}
                    {symbols.map((symbolB) => {
                      const val = matrix[symbolA]?.[symbolB] ?? null;
                      const overlap = overlapCounts[symbolA]?.[symbolB] ?? 0;
                      const isSelected =
                        selectedCell?.symbolA === symbolA &&
                        selectedCell?.symbolB === symbolB;

                      return (
                        <button
                          key={`${symbolA}-${symbolB}`}
                          onClick={() => {
                            if (symbolA !== symbolB && overlap >= 15) {
                              setSelectedCell({ symbolA, symbolB });
                            }
                          }}
                          disabled={symbolA === symbolB || overlap < 15}
                          title={`${symbolA} & ${symbolB}: ${
                            val !== null ? val.toFixed(2) : "N/A"
                          } (${overlap} overlapping days)`}
                          className={`h-10 flex flex-col items-center justify-center rounded-lg text-xs font-semibold cursor-pointer border transition-all ${getHeatmapColor(
                            val
                          )} ${
                            isSelected
                              ? "ring-2 ring-blue-500 border-transparent scale-[1.02]"
                              : "border-transparent hover:scale-[1.01]"
                          }`}
                        >
                          <span>{val !== null ? val.toFixed(2) : "N/A"}</span>
                          <span className="text-[7.5px] opacity-60 font-normal">
                            ({overlap}d)
                          </span>
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="text-[10.5px] text-muted-foreground space-y-1 pt-1.5 border-t">
              <p>• Matrices require at least 15 daily return intersections to compute Pearson coefficients.</p>
              <p>• Green blocks signify positive correlation; Red blocks signify negative correlation.</p>
            </div>
          </div>

          {/* Scatter Plot */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            {selectedCell ? (
              <>
                <div className="flex items-center justify-between border-b pb-2 font-medium text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      Daily Returns Comparison: {selectedCell.symbolA} vs. {selectedCell.symbolB}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">
                    r = {matrix[selectedCell.symbolA]?.[selectedCell.symbolB]?.toFixed(2)}
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        type="number"
                        dataKey="returnA"
                        name={selectedCell.symbolA}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: `${selectedCell.symbolA} Return`, position: "bottom", offset: 0, fontSize: 11 }}
                        style={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="returnB"
                        name={selectedCell.symbolB}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: `${selectedCell.symbolB} Return`, angle: -90, position: "left", offset: 0, fontSize: 11 }}
                        style={{ fontSize: 10 }}
                      />
                      <ZAxis type="number" range={[60, 60]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e1e2e", borderColor: "#313244", color: "#cdd6f4", borderRadius: "12px", fontSize: 11 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => [`${formatNumber(Number(value || 0) * 100)}%`, String(name || "")]}
                      />
                      <Scatter
                        name={`${selectedCell.symbolA} vs ${selectedCell.symbolB}`}
                        data={alignedPoints}
                        fill="#3b82f6"
                        opacity={0.7}
                      />
                    </RechartsScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="text-xs text-muted-foreground flex items-start gap-2 bg-muted/20 p-3 rounded-xl">
                  <HelpCircle className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
                  <span>
                    Each dot represents a single trading day&apos;s return pair. A clustering along the diagonal line indicates high positive correlation (they tend to gain and lose together).
                  </span>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-2">
                <TrendingUp className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
                <h3 className="text-sm font-semibold">Select a correlation cell</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Click on any valid grid cell in the heatmap matrix on the left to inspect its aligned daily returns scatter plot.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
