import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calculateWeightedBeta,
  calculateHHI,
  getHHILabel,
  type RiskAsset,
} from "@/lib/risk";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getQuote, getKeyMetrics } from "@/lib/market/finnhub";
import { type Holding } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";

function getBetaTone(beta: number) {
  if (beta < 0.8)
    return { label: "Defensive / Conservative", color: "text-emerald-600 dark:text-emerald-400" };
  if (beta <= 1.2)
    return { label: "Market Matching Risk", color: "text-blue-600 dark:text-blue-400" };
  return { label: "High Volatility / Aggressive", color: "text-red-600 dark:text-red-400" };
}

export default async function RiskDiagnosticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio/risk");
  }

  const { data, error } = await supabase
    .from("holdings")
    .select("id,symbol,shares,avg_cost,purchased_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const holdings = (data ?? []).map((h) => ({
    ...h,
    shares: Number(h.shares),
    avg_cost: Number(h.avg_cost),
  })) as Holding[];

  const [quoteResults, metricsResults] = await Promise.all([
    Promise.allSettled(holdings.map((h) => getQuote(h.symbol))),
    Promise.allSettled(holdings.map((h) => getKeyMetrics(h.symbol))),
  ]);

  // Only assets with both a live quote and a reported beta enter the analysis,
  // so a quote outage or missing beta cannot silently skew the risk numbers.
  const assets: RiskAsset[] = [];
  const unpriced: string[] = [];
  holdings.forEach((h, idx) => {
    const quoteResult = quoteResults[idx];
    const metricsResult = metricsResults[idx];
    const price =
      quoteResult.status === "fulfilled" ? quoteResult.value.price : null;
    const beta =
      metricsResult.status === "fulfilled" &&
      metricsResult.value.beta !== null &&
      Number.isFinite(metricsResult.value.beta)
        ? metricsResult.value.beta
        : null;

    if (price === null || beta === null) {
      unpriced.push(h.symbol);
      return;
    }
    assets.push({ symbol: h.symbol, value: h.shares * price, beta });
  });

  const weightedBeta = calculateWeightedBeta(assets);
  const hhi = calculateHHI(assets);
  const hhiInfo = getHHILabel(hhi);
  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  const betaTone = getBetaTone(weightedBeta);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
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
              Portfolio beta and concentration for your holdings, weighted by
              position value.
            </p>
          </div>
        </div>
        <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm transition-all">
          <Link href="/portfolio/risk/simulations">
            Monte Carlo Simulator
          </Link>
        </Button>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground font-semibold">
            {holdings.length === 0
              ? "No holdings yet. Add positions on the portfolio page to analyze risk."
              : "Live quotes or beta data are unavailable for your holdings right now. Try again shortly."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-1">
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 text-center">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase">
                  Volatility Index (Beta)
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Weighted average relative to S&amp;P 500 (1.0)
                </p>
              </div>
              <div className={cn("text-4xl font-extrabold tabular-nums", betaTone.color)}>
                {weightedBeta.toFixed(2)}
              </div>
              <span className={cn("text-xs font-bold block", betaTone.color)}>
                {betaTone.label}
              </span>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 text-center">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase">
                  Concentration Index (HHI)
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Diversification scoring (lower is safer)
                </p>
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

          <div className="md:col-span-2 space-y-6">
            <section className="rounded-2xl border bg-card p-4 shadow-sm overflow-x-auto">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-foreground">
                  Asset Breakdown &amp; Risk Weight
                </h2>
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
              {unpriced.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Excluded (no live quote or beta): {unpriced.join(", ")}
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
