"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, BrainCircuit, Loader2, ArrowLeft, AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdvisorResult {
  rating: string;
  weightedBeta: number;
  summary: string;
  sectorExposure: { sector: string; weight: number }[];
  recommendations: { action: string; symbol: string; reason: string }[];
}

export default function AdvisorPage() {
  const [goal, setGoal] = useState("Balanced");
  const [portfolioType, setPortfolioType] = useState("real");
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleAnalyze() {
    setLoading(true);
    setErrorMsg("");
    setResult(null);

    try {
      const response = await fetch("/api/portfolio/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, portfolioType }),
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.result) {
        setResult(data.result);
      } else {
        throw new Error();
      }
    } catch {
      setErrorMsg("Failed to run portfolio diagnostics. Ensure you have active holdings to review.");
    } finally {
      setLoading(false);
    }
  }

  const PIE_COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#6B7280"];

  function getRatingColor(rating: string) {
    if (rating.startsWith("A")) return "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (rating.startsWith("B")) return "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10";
    if (rating.startsWith("C")) return "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" className="rounded-full">
          <Link href="/portfolio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            AI Portfolio Advisor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Optimize your asset allocation, sector weights, and risk profiles using Gemini AI.
          </p>
        </div>
      </div>

      {/* Inputs Card */}
      <section className="rounded-2xl border bg-card p-4.5 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Portfolio Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">Target Portfolio</label>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPortfolioType("real")}
                className={cn("rounded-lg py-1.5 transition-all", portfolioType === "real" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
              >
                Real Holdings
              </button>
              <button
                type="button"
                onClick={() => setPortfolioType("paper")}
                className={cn("rounded-lg py-1.5 transition-all", portfolioType === "paper" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
              >
                Paper Trading
              </button>
            </div>
          </div>

          {/* Goal Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">Investment Objective</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="border-input bg-background focus-visible:ring-ring flex h-9.5 w-full rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none font-semibold"
            >
              <option value="Balanced">Balanced Allocation</option>
              <option value="Income">Conservative Dividend Income</option>
              <option value="High Growth">Aggressive Growth</option>
            </select>
          </div>

          {/* Action Trigger */}
          <div className="flex items-end">
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full rounded-xl bg-primary hover:bg-primary/95 text-white gap-1.5 h-9.5 font-bold"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 fill-current" />
              )}
              Analyze Portfolio
            </Button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold bg-red-500/10 p-2 rounded-lg border border-red-500/20 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {errorMsg}
          </p>
        )}
      </section>

      {/* Loading state indicator */}
      {loading && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <h3 className="text-sm font-semibold">Gemini is running portfolio diagnostics...</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            This reviews your holdings, computes overall beta indexes, and aggregates sector diversification weights.
          </p>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Summary Card */}
          <div className="space-y-6 md:col-span-1">
            {/* Rating Box */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm text-center space-y-4">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase">Allocation Grade</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Aligned with &quot;{goal}&quot; goal</p>
              </div>
              <div className={cn("mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 text-3xl font-extrabold shadow-inner", getRatingColor(result.rating))}>
                {result.rating}
              </div>
              <div className="border-t pt-3 flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Portfolio Beta:
                </span>
                <span className="tabular-nums text-foreground font-bold">
                  {result.weightedBeta.toFixed(2)}
                </span>
              </div>
            </section>

            {/* Sector Exposure Chart */}
            <section className="rounded-2xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground mb-3">Sector Exposure Breakdown</h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={result.sectorExposure}
                      dataKey="weight"
                      nameKey="sector"
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                      innerRadius="45%"
                    >
                      {result.sectorExposure.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border bg-popover px-2.5 py-1.5 text-[10px] shadow-lg font-bold">
                            <span className="text-foreground">{data.sector}: {data.weight}%</span>
                          </div>
                        );
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5 text-xs font-semibold">
                {result.sectorExposure.map((entry, index) => (
                  <div key={entry.sector} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      {entry.sector}
                    </span>
                    <span className="text-foreground font-bold">{entry.weight}%</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Recommendation Panel */}
          <div className="space-y-6 md:col-span-2">
            {/* Overview / Summary card */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-foreground">Allocation Diagnostics Summary</h3>
              <p className="text-sm leading-relaxed text-muted-foreground font-semibold">
                {result.summary}
              </p>
            </section>

            {/* Recommendations List */}
            <section className="space-y-3">
              <h3 className="text-base font-bold text-foreground">AI Rebalancing Trade Recommendations</h3>
              <div className="space-y-3">
                {result.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="group relative rounded-2xl border bg-card p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between border-l-4 border-l-primary"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Action {index + 1}
                        </span>
                        <h4 className="text-base font-bold pt-1">{rec.action}</h4>
                        <p className="text-xs text-muted-foreground font-semibold mt-1">
                          {rec.reason}
                        </p>
                      </div>
                      <Link
                        href={`/stock/${rec.symbol}`}
                        className="text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5 px-2.5 py-1 rounded-lg"
                      >
                        Trade {rec.symbol}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="rounded-2xl border border-dashed p-16 text-center text-sm text-muted-foreground font-semibold max-w-xl mx-auto space-y-2">
          <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-70" />
          <p>Choose an objective and click &quot;Analyze Portfolio&quot; to run allocation reviews.</p>
        </div>
      )}
    </div>
  );
}
