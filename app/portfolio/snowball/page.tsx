"use client";

import { useState } from "react";
import {
  TrendingUp,
  Sliders,
  Loader2,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { runSnowballProjection } from "@/lib/snowball.ts";
import NextLink from "next/link";

export default function SnowballPage() {
  const [initialValue, setInitialValue] = useState("10000");
  const [initialDividends, setInitialDividends] = useState("300"); // 3% yield

  const [monthlyContribution, setMonthlyContribution] = useState("500");
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const [dividendGrowthRate, setDividendGrowthRate] = useState("5.0");
  const [priceAppreciation, setPriceAppreciation] = useState("6.0");
  const [timeHorizon, setTimeHorizon] = useState("20");

  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportPortfolio = async () => {
    setImporting(true);
    setImportSuccess(false);
    setImportError(null);

    try {
      const res = await fetch("/api/portfolio/summary");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to import portfolio");
      }
      setInitialValue(String(data.portfolioValue));
      setInitialDividends(String(data.annualDividends));
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setImportError("Could not retrieve active portfolio data");
    } finally {
      setImporting(false);
    }
  };

  const valNum = Math.max(0, parseFloat(initialValue) || 0);
  const divNum = Math.max(0, parseFloat(initialDividends) || 0);
  const contrNum = Math.max(0, parseFloat(monthlyContribution) || 0);
  const divGrowth = Math.max(0, parseFloat(dividendGrowthRate) || 0) / 100;
  const priceApprec = Math.max(0, parseFloat(priceAppreciation) || 0) / 100;
  const horizon = Math.max(1, parseInt(timeHorizon) || 20);
  const annualContributions = contrNum * 12;

  const projection = runSnowballProjection({
    initialPortfolioValue: valNum,
    initialAnnualDividends: divNum,
    monthlyContribution: contrNum,
    reinvestDividends,
    dividendGrowthRate: divGrowth,
    expectedPriceAppreciation: priceApprec,
    timeHorizonYears: horizon,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <NextLink
          href="/portfolio"
          className="rounded-xl border bg-card p-2 text-muted-foreground hover:text-foreground shadow-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </NextLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dividend Snowball Calculator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Project portfolio growth, contribution gains, and compound interest using the Dividend Reinvestment Plan (DRIP).
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                <Sliders className="h-4 w-4" />
                <span>Planner Assumptions</span>
              </div>
              <button
                onClick={handleImportPortfolio}
                disabled={importing}
                className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : importSuccess ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-400" />
                    <span className="text-green-400">Synced!</span>
                  </>
                ) : (
                  <span>Sync Portfolio</span>
                )}
              </button>
            </div>

            {importError && (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/10 text-red-400 text-xs">
                {importError}
              </div>
            )}

            {/* Initial Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Portfolio Value ($)</label>
                <Input
                  type="number"
                  className="rounded-xl"
                  placeholder="10000"
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Annual Dividends ($)</label>
                <Input
                  type="number"
                  className="rounded-xl"
                  placeholder="300"
                  value={initialDividends}
                  onChange={(e) => setInitialDividends(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 border-t pt-3.5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Monthly Savings Contribution</span>
                  <span>{formatPrice(contrNum)}/mo</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Time Horizon Projection</span>
                  <span>{timeHorizon} years</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(e.target.value)}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Annual Dividend Growth Rate</span>
                  <span>{dividendGrowthRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={dividendGrowthRate}
                  onChange={(e) => setDividendGrowthRate(e.target.value)}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Stock Price Appreciation</span>
                  <span>{priceAppreciation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={priceAppreciation}
                  onChange={(e) => setPriceAppreciation(e.target.value)}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* DRIP Toggle */}
              <div className="flex items-center justify-between border-t pt-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium">Reinvest Dividends (DRIP)</span>
                  <span className="text-[10px] text-muted-foreground">Use payouts to buy more shares</span>
                </div>
                <input
                  type="checkbox"
                  checked={reinvestDividends}
                  onChange={(e) => setReinvestDividends(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metric Cards Grid */}
          <div className="grid gap-3.5 grid-cols-2 md:grid-cols-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Projected Portfolio</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-semibold">
                  {formatPrice(projection.points[projection.points.length - 1]?.portfolioValue ?? 0)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Projected Dividends</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-semibold">
                  {formatPrice(projection.points[projection.points.length - 1]?.annualDividends ?? 0)}
                </span>
                <span className="text-xs text-muted-foreground">/yr</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Dividends Harvested</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-semibold">{formatPrice(projection.totalDividendsReceived)}</span>
                <span className="text-xs text-muted-foreground">tot</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Yield On Cost</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-semibold">{projection.finalYieldOnCost.toFixed(2)}%</span>
                <span className="text-xs text-muted-foreground">yoc</span>
              </div>
            </div>
          </div>

          {/* Crossover Alert Box */}
          {projection.crossoverYear !== null && (
            <div className="p-4 rounded-2xl border border-green-500/20 bg-green-500/5 text-green-400 text-sm flex items-start gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-green-300">Dividend Income Crossover Reached!</span>
                <p className="mt-0.5 text-xs text-green-400/80">
                  In Year {projection.crossoverYear}, your annual dividend income ({formatPrice(projection.points[projection.crossoverYear].annualDividends)}) will exceed your annual contributions ({formatPrice(annualContributions)}). At this point, the snowball is self-funding.
                </p>
              </div>
            </div>
          )}

          {/* Area Chart */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2 font-medium text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Projected Growth Timeline</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projection.points}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorBasis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="year" tickFormatter={(y) => `Yr ${y}`} tickMargin={6} style={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} style={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e1e2e", borderColor: "#313244", color: "#cdd6f4", borderRadius: "12px", fontSize: 12 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [formatPrice(Number(value || 0)), ""]}
                  />
                  <Legend style={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="portfolioValue"
                    name="Projected Portfolio Value"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorVal)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="costBasis"
                    name="Cumulative Invested Cost"
                    stroke="#94a3b8"
                    fillOpacity={1}
                    fill="url(#colorBasis)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="text-xs text-muted-foreground flex items-start gap-2 bg-muted/20 p-3.5 rounded-xl">
              <HelpCircle className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
              <span>
                Reinvesting dividends compounds your share count faster. Price appreciation grows the value of those compounding shares, creating the classic exponential &quot;snowball&quot; curve.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
