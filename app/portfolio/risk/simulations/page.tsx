"use client";

import { useState } from "react";
import {
  Sliders,
  Loader2,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  BarChart,
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
  Line,
} from "recharts";
import { runMonteCarloSimulation } from "@/lib/monte-carlo.ts";
import NextLink from "next/link";

export default function MonteCarloPage() {
  const [initialCapital, setInitialCapital] = useState("10000");
  const [monthlyContribution, setMonthlyContribution] = useState("500");
  const [annualReturn, setAnnualReturn] = useState("8.0");
  const [annualVolatility, setAnnualVolatility] = useState("15.0");
  const [timeHorizon, setTimeHorizon] = useState("20");
  const [targetValue, setTargetValue] = useState("250000");

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
      setInitialCapital(String(data.portfolioValue));
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setImportError("Could not retrieve active portfolio value");
    } finally {
      setImporting(false);
    }
  };

  const capNum = Math.max(0, parseFloat(initialCapital) || 0);
  const contrNum = Math.max(0, parseFloat(monthlyContribution) || 0);
  const retNum = Math.max(-50, parseFloat(annualReturn) || 0) / 100;
  const volNum = Math.max(0, parseFloat(annualVolatility) || 0) / 100;
  const horizon = Math.max(1, parseInt(timeHorizon) || 20);
  const targetNum = Math.max(0, parseFloat(targetValue) || 0);

  // Execute simulation (runs instant ~3ms on client)
  const simulation = runMonteCarloSimulation({
    initialCapital: capNum,
    monthlyContribution: contrNum,
    annualReturn: retNum,
    annualVolatility: volNum,
    timeHorizonYears: horizon,
    simulationCount: 250,
    targetValue: targetNum,
    seed: 42,
  });

  const finalYearPoint = simulation.points[simulation.points.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <NextLink
          href="/portfolio/risk"
          className="rounded-xl border bg-card p-2 text-muted-foreground hover:text-foreground shadow-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </NextLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Monte Carlo Planner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulate 250 random market paths based on expected returns and volatility to project portfolio distribution ranges.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                <Sliders className="h-4 w-4" />
                <span>Simulation Parameters</span>
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

            {/* Starting Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Starting Capital ($)</label>
                <Input
                  type="number"
                  className="rounded-xl"
                  placeholder="10000"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Target Portfolio ($)</label>
                <Input
                  type="number"
                  className="rounded-xl"
                  placeholder="250000"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 border-t pt-3.5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Monthly Contribution</span>
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
                  <span className="text-muted-foreground">Time Horizon</span>
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
                  <span className="text-muted-foreground">Expected Annual Return</span>
                  <span>{annualReturn}%</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="25"
                  step="0.5"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(e.target.value)}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Annual Volatility</span>
                  <span>{annualVolatility}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="0.5"
                  value={annualVolatility}
                  onChange={(e) => setAnnualVolatility(e.target.value)}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary stats */}
          <div className="grid gap-3.5 grid-cols-2 md:grid-cols-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Target Success Rate</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-lg font-semibold ${simulation.probabilityOfSuccess >= 70 ? 'text-green-400' : 'text-blue-400'}`}>
                  {simulation.probabilityOfSuccess}%
                </span>
                <span className="text-xs text-muted-foreground">prob</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Median Projection</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-semibold">{formatPrice(finalYearPoint?.percentile50 ?? 0)}</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Conservative (P10)</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-semibold">{formatPrice(finalYearPoint?.percentile10 ?? 0)}</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Aggressive (P90)</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-semibold text-blue-400">{formatPrice(finalYearPoint?.percentile90 ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Fan Chart */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2 font-medium text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                <span>Monte Carlo Percentile Boundaries</span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation.points}>
                  <defs>
                    <linearGradient id="fan90" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fan50" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
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
                    dataKey="percentile90"
                    name="Aggressive Boundary (90th Percentile)"
                    stroke="#3b82f6"
                    fill="url(#fan90)"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentile50"
                    name="Median Expectation (50th Percentile)"
                    stroke="#22c55e"
                    fill="url(#fan50)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentile10"
                    name="Conservative Boundary (10th Percentile)"
                    stroke="#ef4444"
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="costBasis"
                    name="Total Invested Cost"
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="text-xs text-muted-foreground flex items-start gap-2 bg-muted/20 p-3.5 rounded-xl">
              <HelpCircle className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
              <span>
                Monte Carlo simulations model standard stock volatility risk from your assumptions. The conservative boundary is the lower simulated outcome range, while the median captures the middle path across all runs.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
