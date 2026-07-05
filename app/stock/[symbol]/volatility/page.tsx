"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  calculateProjectedMove,
  calculateProjectedPrice,
  getBetaVolatilityLabel,
} from "@/lib/volatility";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export default function VolatilitySimulatorPage({ params }: PageProps) {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [beta, setBeta] = useState<number | null>(null);
  const [name, setName] = useState(upperSymbol);
  const [marketMove, setMarketMove] = useState(10); // Default 10% move
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/stock/${upperSymbol}/beta`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setCurrentPrice(data.price ?? 0);
        setBeta(data.beta ?? null);
        setName(data.name ?? upperSymbol);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setErrorMsg(`Failed to load asset data for ${upperSymbol}`);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [upperSymbol]);

  const projectedMove = calculateProjectedMove(beta ?? 0, marketMove);
  const projectedPrice = calculateProjectedPrice(currentPrice, projectedMove);
  const volLabel = getBetaVolatilityLabel(beta ?? 1);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/stock/${symbol}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Volatility Simulator</h1>
          <p className="text-muted-foreground">
            Model how {name} ({upperSymbol}) behaves relative to S&P 500 market shifts.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading simulator data...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 text-center">
          {errorMsg}
        </div>
      ) : beta === null ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          No published beta is available for {upperSymbol}, so a market-relative
          projection cannot be shown.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Controls: Left Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Slider Card */}
            <div className="p-6 rounded-xl border bg-card shadow-sm space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Simulated Market Shift
                </h2>
                <p className="text-xs text-muted-foreground">
                  Adjust the slider to simulate a broad S&P 500 index movement.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-muted-foreground">S&P 500 Market Move</span>
                  <span
                    className={cn(
                      "font-mono px-3 py-1 rounded-full text-xs font-bold border",
                      marketMove > 0
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : marketMove < 0
                        ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                        : "bg-muted border-muted-foreground/10 text-muted-foreground"
                    )}
                  >
                    {marketMove > 0 ? "+" : ""}
                    {marketMove}%
                  </span>
                </div>

                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={marketMove}
                  onChange={(e) => setMarketMove(Number(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />

                <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-semibold">
                  <span>Severe Drop (-50%)</span>
                  <span>Flat (0%)</span>
                  <span>Severe Rally (+50%)</span>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-5 rounded-xl border bg-card shadow-sm space-y-1 text-center">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  Projected Return
                </span>
                <div
                  className={cn(
                    "text-3xl font-extrabold tabular-nums",
                    projectedMove > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : projectedMove < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                  )}
                >
                  {projectedMove > 0 ? "+" : ""}
                  {projectedMove.toFixed(2)}%
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  Scaled by Beta factor of {beta.toFixed(2)}
                </p>
              </div>

              <div className="p-5 rounded-xl border bg-card shadow-sm space-y-1 text-center">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  Projected Price
                </span>
                <div className="text-3xl font-extrabold tabular-nums text-foreground">
                  {formatPrice(projectedPrice)}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  Starting Price: {formatPrice(currentPrice)}
                </p>
              </div>
            </div>
          </div>

          {/* Diagnostics: Right Panel */}
          <div className="space-y-6">
            {/* Beta Factor Info Card */}
            <div className="p-6 rounded-xl border bg-card shadow-sm space-y-4">
              <h2 className="text-md font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Beta Volatility Index
              </h2>

              <div className="text-center py-4 bg-muted/20 border rounded-xl">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground block">
                  Beta Coefficient
                </span>
                <span className="text-4xl font-extrabold text-foreground">{beta.toFixed(2)}</span>
              </div>

              <div className={cn("p-3 rounded-lg border text-xs font-semibold space-y-1", volLabel.tone)}>
                <div className="font-bold">{volLabel.label}</div>
                <p className="text-[11px] font-normal leading-normal opacity-90">
                  {volLabel.description}
                </p>
              </div>

              <div className="text-[11px] leading-relaxed text-muted-foreground font-medium border-t pt-3 space-y-2">
                <p>
                  <strong>How it works:</strong> Beta measures a stock&apos;s price volatility compared to the S&P 500 index.
                </p>
                <p>
                  A Beta of 1.0 means the stock moves exactly with the market. A Beta of 1.5 implies the stock is projected to drop 15% if the market drops 10%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
