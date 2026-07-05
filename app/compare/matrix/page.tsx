"use client";

import { useEffect, useState } from "react";
import { Plus, X, Loader2, ArrowRightLeft, Shield, BarChart3, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ComparedStock {
  symbol: string;
  name: string;
  peRatio: number | null;
  dividendYield: number | null;
  beta: number | null;
  price: number;
  changePercent: number;
  eps: number | null;
}

export default function CompareMatrixPage() {
  const [symbols, setSymbols] = useState<string[]>(["AAPL", "MSFT", "GOOGL"]);
  const [inputSymbol, setInputSymbol] = useState("");
  const [stocks, setStocks] = useState<ComparedStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (symbols.length === 0) {
      Promise.resolve().then(() => {
        setStocks([]);
        setLoading(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setLoading(true);
      setErrorMsg("");
    });
    const params = new URLSearchParams({ symbols: symbols.join(",") });
    fetch(`/api/compare/matrix?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch matrix data");
        return res.json();
      })
      .then((data) => {
        if (data.stocks) {
          setStocks(data.stocks);
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load comparison data. Please check your network connection.");
      })
      .finally(() => setLoading(false));
  }, [symbols]);

  function handleAddSymbol(e: React.FormEvent) {
    e.preventDefault();
    const sym = inputSymbol.trim().toUpperCase();
    if (!sym) return;
    if (symbols.includes(sym)) {
      setErrorMsg("Symbol is already in comparison list");
      return;
    }
    if (symbols.length >= 4) {
      setErrorMsg("Maximum of 4 symbols can be compared at once");
      return;
    }
    if (!/^[A-Z0-9.^-]{1,12}$/.test(sym)) {
      setErrorMsg("Invalid stock symbol format");
      return;
    }

    setSymbols((prev) => [...prev, sym]);
    setInputSymbol("");
    setErrorMsg("");
  }

  function handleRemoveSymbol(sym: string) {
    setSymbols((prev) => prev.filter((s) => s !== sym));
    setErrorMsg("");
  }

  // Radar mapping algorithm to score metrics out of 100
  // Value (peRatio: lower is better, standard pe 15-25 gets 60-80 score)
  // Yield (dividendYield: higher is better, 4% gets 80, cap at 100)
  // Risk (beta: lower is better, 1.0 gets 70)
  // Profitability (eps: higher is better, 10 gets 80)
  // Momentum (changePercent: higher is better, 2% gets 70)
  const radarFields = [
    { key: "value", label: "Valuation Score (P/E)" },
    { key: "yield", label: "Income Score (Yield)" },
    { key: "risk", label: "Stability Score (Beta)" },
    { key: "profitability", label: "EPS Strength" },
    { key: "momentum", label: "Price Momentum" },
  ];

  const radarData = radarFields.map((field) => {
    const dataPoint: Record<string, string | number> = {
      subject: field.label,
    };

    stocks.forEach((stock) => {
      let score = 50; // Default baseline score
      if (field.key === "value") {
        const pe = stock.peRatio;
        if (pe !== null && pe > 0) {
          score = Math.max(10, Math.min(100, 110 - pe * 1.5));
        } else {
          score = 30; // Unknown or negative PE
        }
      } else if (field.key === "yield") {
        const y = stock.dividendYield;
        score = y !== null ? Math.max(10, Math.min(100, 30 + y * 15)) : 30;
      } else if (field.key === "risk") {
        const b = stock.beta;
        score = b !== null ? Math.max(10, Math.min(100, 110 - b * 40)) : 50;
      } else if (field.key === "profitability") {
        const eps = stock.eps;
        score = eps !== null ? Math.max(10, Math.min(100, 30 + eps * 5)) : 40;
      } else if (field.key === "momentum") {
        const chg = stock.changePercent;
        score = Math.max(10, Math.min(100, 50 + chg * 10));
      }

      dataPoint[stock.symbol] = Math.round(score);
    });

    return dataPoint;
  });

  const radarColors = [
    { stroke: "rgb(139, 92, 246)", fill: "rgba(139, 92, 246, 0.2)" },
    { stroke: "rgb(16, 185, 129)", fill: "rgba(16, 185, 129, 0.2)" },
    { stroke: "rgb(245, 158, 11)", fill: "rgba(245, 158, 11, 0.2)" },
    { stroke: "rgb(239, 68, 68)", fill: "rgba(239, 68, 68, 0.2)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Comparison Matrix
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze valuations, risk parameters, and returns side-by-side.
          </p>
        </div>
      </div>

      {/* Control Form & Badges */}
      <section className="rounded-2xl border bg-card p-4.5 shadow-sm space-y-4">
        <form onSubmit={handleAddSymbol} className="flex gap-2 max-w-md">
          <Input
            placeholder="Enter symbol (e.g. KO, LLY)"
            className="rounded-xl uppercase"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value)}
          />
          <Button type="submit" className="rounded-xl gap-1">
            <Plus className="h-4 w-4" />
            Compare
          </Button>
        </form>

        {symbols.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {symbols.map((sym) => (
              <span
                key={sym}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted border border-border text-foreground"
              >
                {sym}
                <button
                  type="button"
                  onClick={() => handleRemoveSymbol(sym)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/15 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold bg-red-500/10 p-2 rounded-lg border border-red-500/20 max-w-md flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {errorMsg}
          </p>
        )}
      </section>

      {symbols.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground font-semibold">
            Add at least one stock symbol to view the comparison matrix.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Radar Chart Panel */}
          <section className="rounded-2xl border bg-card p-4 shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div className="mb-2">
              <h2 className="text-base font-semibold">Relative Metrics Radar</h2>
              <p className="text-xs text-muted-foreground">Comparative vector analysis (higher is better)</p>
            </div>
            <div className="h-[280px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="var(--border)" opacity={0.3} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: "bold" }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  {stocks.map((stock, idx) => (
                    <Radar
                      key={stock.symbol}
                      name={stock.symbol}
                      dataKey={stock.symbol}
                      stroke={radarColors[idx % radarColors.length].stroke}
                      fill={radarColors[idx % radarColors.length].fill}
                      fillOpacity={0.25}
                    />
                  ))}
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, fontWeight: "bold" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg space-y-1.5">
                          <p className="font-bold text-foreground border-b pb-1 mb-1">
                            {payload[0].name}
                          </p>
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex justify-between gap-4 font-semibold">
                              <span className="text-muted-foreground">{String(p.dataKey)}:</span>
                              <span className="text-foreground">{p.value}/100</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Metric Comparison Table */}
          <section className="rounded-2xl border bg-card p-4 shadow-sm lg:col-span-3 overflow-x-auto">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Metric Comparison</h2>
              <p className="text-xs text-muted-foreground">Raw metrics comparison</p>
            </div>
            <table className="w-full text-sm leading-relaxed border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground text-xs font-bold text-left">
                  <th className="py-2.5">Metric</th>
                  {stocks.map((stock) => (
                    <th key={stock.symbol} className="py-2.5 px-3 text-right">
                      {stock.symbol}
                      <p className="text-[10px] text-muted-foreground font-semibold line-clamp-1 max-w-[90px] ml-auto">
                        {stock.name}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y font-semibold">
                <tr>
                  <td className="py-3 text-muted-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-primary" /> Price
                  </td>
                  {stocks.map((stock) => (
                    <td key={stock.symbol} className="py-3 px-3 text-right tabular-nums">
                      {formatPrice(stock.price)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" /> 1D Return
                  </td>
                  {stocks.map((stock) => {
                    const color = stock.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
                    return (
                      <td key={stock.symbol} className={cn("py-3 px-3 text-right tabular-nums font-bold", color)}>
                        {stock.changePercent >= 0 ? "+" : ""}
                        {stock.changePercent.toFixed(2)}%
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-purple-500" /> P/E Ratio
                  </td>
                  {stocks.map((stock) => (
                    <td key={stock.symbol} className="py-3 px-3 text-right tabular-nums">
                      {stock.peRatio !== null ? stock.peRatio.toFixed(1) : "-"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-amber-500" /> Dividend Yield
                  </td>
                  {stocks.map((stock) => (
                    <td key={stock.symbol} className="py-3 px-3 text-right tabular-nums">
                      {stock.dividendYield !== null ? `${stock.dividendYield.toFixed(2)}%` : "0.00%"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-rose-500" /> Beta (Volatility)
                  </td>
                  {stocks.map((stock) => (
                    <td key={stock.symbol} className="py-3 px-3 text-right tabular-nums">
                      {stock.beta !== null ? stock.beta.toFixed(2) : "-"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 text-muted-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-blue-500" /> EPS (TTM)
                  </td>
                  {stocks.map((stock) => (
                    <td key={stock.symbol} className="py-3 px-3 text-right tabular-nums">
                      {stock.eps !== null ? formatPrice(stock.eps) : "-"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
