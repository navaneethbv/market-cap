"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calculateWeightedBeta,
  calculateHHI,
  getHHILabel,
  simulateStressScenarios,
  type RiskAsset,
} from "@/lib/risk";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function RiskDiagnosticsPage() {
  const [portfolioType, setPortfolioType] = useState<"real" | "paper">("real");
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<RiskAsset[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => {
      setLoading(true);
      setErrorMsg("");
    });

    fetch("/api/portfolio/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "Balanced", portfolioType }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.holdings) {
          setAssets(data.holdings);
        } else {
          setAssets([]);
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load portfolio metrics. Ensure you have active holdings.");
      })
      .finally(() => setLoading(false));
  }, [portfolioType]);

  const weightedBeta = calculateWeightedBeta(assets);
  const hhi = calculateHHI(assets);
  const hhiInfo = getHHILabel(hhi);
  const stressResults = simulateStressScenarios(assets);
  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

  function getBetaTone(beta: number) {
    if (beta < 0.8) return { label: "Defensive / Conservative", color: "text-emerald-600 dark:text-emerald-400" };
    if (beta <= 1.2) return { label: "Market Matching Risk", color: "text-blue-600 dark:text-blue-400" };
    return { label: "High Volatility / Aggressive", color: "text-red-600 dark:text-red-400" };
  }

  const betaTone = getBetaTone(weightedBeta);

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
            <ShieldAlert className="h-6 w-6 text-primary" />
            Risk Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analyze asset concentration weights, portfolio beta risk factors, and run stress tests.
          </p>
        </div>
      </div>

      {/* Selector Control */}
      <section className="rounded-2xl border bg-card p-4.5 shadow-sm max-w-sm">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-xs font-semibold">
          <button
            onClick={() => setPortfolioType("real")}
            className={cn(
              "rounded-lg py-1.5 transition-all",
              portfolioType === "real" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Real Portfolio
          </button>
          <button
            onClick={() => setPortfolioType("paper")}
            className={cn(
              "rounded-lg py-1.5 transition-all",
              portfolioType === "paper" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Paper Trading
          </button>
        </div>
      </section>

      {errorMsg && (
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold bg-red-500/10 p-2 rounded-lg border border-red-500/20 max-w-md flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          {errorMsg}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground font-semibold">
            No active positions found. Add holdings to start analyzing risk factors.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Risk Factors Column */}
          <div className="space-y-6 md:col-span-1">
            {/* Beta Card */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 text-center">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase">Volatility Index (Beta)</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Weighted average relative to S&P 500 (1.0)</p>
              </div>
              <div className={cn("text-4xl font-extrabold tabular-nums", betaTone.color)}>
                {weightedBeta.toFixed(2)}
              </div>
              <span className={cn("text-xs font-bold block", betaTone.color)}>
                {betaTone.label}
              </span>
            </div>

            {/* HHI Concentration Card */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 text-center">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase">Concentration Index (HHI)</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Diversification scoring (lower is safer)</p>
              </div>
              <div className="text-4xl font-extrabold tabular-nums">
                {Math.round(hhi)}
              </div>
              <span className={cn("text-xs font-bold block", hhiInfo.tone)}>
                {hhiInfo.label}
              </span>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                {hhiInfo.description}
              </p>
            </div>
          </div>

          {/* Stress Tester / Scenarios */}
          <div className="md:col-span-2 space-y-6">
            {/* Stress Test Diagnostics */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-semibold">Max Drawdown Stress Test</h2>
                <p className="text-xs text-muted-foreground">Simulates historical market crashes against your current positions</p>
              </div>
              <div className="space-y-4">
                {stressResults.map((scenario) => {
                  const pct = scenario.lossPercent;
                  return (
                    <div
                      key={scenario.name}
                      className="border rounded-xl p-4 bg-muted/10 space-y-2.5"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h4 className="text-sm font-bold">{scenario.name}</h4>
                          <p className="text-xs text-muted-foreground font-semibold max-w-md">
                            {scenario.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={cn("text-base font-bold tabular-nums", pct >= 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                            {pct >= 0 ? "-" : "+"}
                            {Math.abs(pct).toFixed(2)}%
                          </span>
                          <p className="text-xs text-muted-foreground font-bold tabular-nums mt-0.5">
                            {pct >= 0 ? "-" : "+"}
                            {formatPrice(Math.abs(scenario.lossAmount))}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Diversification Matrix list */}
            <section className="rounded-2xl border bg-card p-4 shadow-sm overflow-x-auto">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-foreground">Asset Breakdown & Risk Weight</h2>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b text-muted-foreground font-bold text-left">
                    <th className="py-2">Symbol</th>
                    <th className="py-2 text-right">Value</th>
                    <th className="py-2 text-right">Weight</th>
                    <th className="py-2 text-right">Beta</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-semibold text-muted-foreground">
                  {assets.map((asset) => {
                    const weight = totalValue === 0 ? 0 : (asset.value / totalValue) * 100;
                    return (
                      <tr key={asset.symbol}>
                        <td className="py-2.5 font-bold text-foreground">{asset.symbol}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatPrice(asset.value)}</td>
                        <td className="py-2.5 text-right tabular-nums">{weight.toFixed(1)}%</td>
                        <td className="py-2.5 text-right tabular-nums">{asset.beta.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
