"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  calculatePayoffCurve,
  calculateExpirationPayoff,
  type OptionStrategyType,
} from "@/lib/options-payoff";

import { downloadCsvFile } from "@/lib/download-csv";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";

interface StrategyOption {
  type: OptionStrategyType;
  name: string;
  bias: "Bullish" | "Bearish" | "Income / Neutral";
  description: string;
  isSpread?: boolean;
}

const STRATEGIES: readonly StrategyOption[] = [
  {
    type: "long_call",
    name: "Long Call",
    bias: "Bullish",
    description: "Buy a call option to profit from upward price movements with capped risk.",
  },
  {
    type: "long_put",
    name: "Long Put",
    bias: "Bearish",
    description: "Buy a put option to profit from downward price drops or hedge downside.",
  },
  {
    type: "covered_call",
    name: "Covered Call",
    bias: "Income / Neutral",
    description: "Hold 100 shares of stock and sell an OTM call option for cash income.",
  },
  {
    type: "cash_secured_put",
    name: "Cash-Secured Put",
    bias: "Bullish",
    description: "Sell an OTM put option with cash set aside to acquire shares at a discount.",
  },
  {
    type: "bull_call_spread",
    name: "Bull Call Spread",
    bias: "Bullish",
    description: "Buy lower strike call and sell higher strike call to reduce cost.",
    isSpread: true,
  },
  {
    type: "bear_put_spread",
    name: "Bear Put Spread",
    bias: "Bearish",
    description: "Buy higher strike put and sell lower strike put to hedge with lower debit.",
    isSpread: true,
  },
];

function getBiasBadgeClass(bias: "Bullish" | "Bearish" | "Income / Neutral"): string {
  if (bias === "Bullish") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (bias === "Bearish") {
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  }
  return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
}

export function OptionsCalculator() {
  const [strategy, setStrategy] = useState<OptionStrategyType>("long_call");
  const [spotPrice, setSpotPrice] = useState("180");
  const [strikePrice, setStrikePrice] = useState("185");
  const [secondaryStrike, setSecondaryStrike] = useState("195");
  const [premium, setPremium] = useState("4.5");
  const [contracts, setContracts] = useState("1");

  const [expirationPrice, setExpirationPrice] = useState("200");

  const currentStrategyInfo = useMemo(() => {
    return STRATEGIES.find((s) => s.type === strategy) ?? STRATEGIES[0];
  }, [strategy]);

  const analysis = useMemo(() => {
    try {
      if ([spotPrice, strikePrice, premium, contracts, ...(currentStrategyInfo.isSpread ? [secondaryStrike] : [])].some((value) => value.trim() === "")) {
        throw new Error("Complete all trade parameters to calculate the payoff.");
      }
      return {
        payoff: calculatePayoffCurve(strategy, Number(spotPrice), Number(strikePrice), Number(premium), Number(contracts), currentStrategyInfo.isSpread ? Number(secondaryStrike) : undefined),
        error: null,
      };
    } catch (error) {
      return { payoff: null, error: error instanceof Error ? error.message : "Check your trade parameters." };
    }
  }, [strategy, spotPrice, strikePrice, secondaryStrike, premium, contracts, currentStrategyInfo]);
  const { payoff } = analysis;
  const scenario = useMemo(() => {
    if (!payoff) return { pnl: null, error: null };
    try {
      if (expirationPrice.trim() === "") throw new Error("Enter an expiration price.");
      return {
        pnl: calculateExpirationPayoff(strategy, Number(expirationPrice), Number(spotPrice), Number(strikePrice), Number(premium), Number(contracts), currentStrategyInfo.isSpread ? Number(secondaryStrike) : undefined),
        error: null,
      };
    } catch (error) {
      return { pnl: null, error: error instanceof Error ? error.message : "Check the expiration price." };
    }
  }, [payoff, expirationPrice, strategy, spotPrice, strikePrice, premium, contracts, secondaryStrike, currentStrategyInfo]);

  function resetParameters() {
    setSpotPrice("180");
    setStrikePrice("185");
    setSecondaryStrike(strategy === "bear_put_spread" ? "175" : "195");
    setPremium("4.5");
    setContracts("1");
    setExpirationPrice("200");
  }

  function exportPayoff() {
    if (!payoff) return;
    const header = "Strategy,Spot price,Strike,Secondary strike,Premium per share,Contracts,Expiration price,Profit or loss";
    const rows = payoff.points.map((point) => [strategy, Number(spotPrice), Number(strikePrice), currentStrategyInfo.isSpread ? Number(secondaryStrike) : "", Number(premium), Number(contracts), point.price, point.pnl].join(","));
    downloadCsvFile([header, ...rows].join("\r\n"), `${strategy}-payoff.csv`);
  }

  return (
    <div className="space-y-6">
      {/* Strategy selector bar */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STRATEGIES.map((s) => {
          const isSelected = s.type === strategy;
          const badgeClass = getBiasBadgeClass(s.bias);

          return (
            <button
              key={s.type}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setStrategy(s.type);
                if (s.type === "bull_call_spread") setSecondaryStrike(String(Number(strikePrice) + 10));
                if (s.type === "bear_put_spread") setSecondaryStrike(String(Math.max(0.01, Number(strikePrice) - 10)));
              }}
              className={`rounded-2xl border p-3.5 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-bold text-sm">{s.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                >
                  {s.bias}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {s.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Input controls & KPI Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Controls Card */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Trade Parameters</h2>
            <Button type="button" variant="ghost" size="sm" onClick={resetParameters} aria-label="Reset trade parameters"><RotateCcw className="h-4 w-4" /> Reset</Button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="options-spot-price" className="text-muted-foreground font-medium block mb-1">
                Underlying Spot Price ($)
              </label>
              <input
                id="options-spot-price"
                type="number"
                step="0.5"
                min="0.01"
                value={spotPrice}
                onChange={(e) => setSpotPrice(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-semibold tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="options-strike-price" className="text-muted-foreground font-medium block mb-1">
                Strike Price ($)
              </label>
              <input
                id="options-strike-price"
                type="number"
                step="0.5"
                min="0.01"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-semibold tabular-nums"
              />
            </div>

            {currentStrategyInfo.isSpread && (
              <div>
                <label htmlFor="options-secondary-strike" className="text-muted-foreground font-medium block mb-1">
                  Secondary Strike Price ($)
                </label>
                <input
                  id="options-secondary-strike"
                  type="number"
                  step="0.5"
                  min="0.01"
                  value={secondaryStrike}
                  onChange={(e) => setSecondaryStrike(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-semibold tabular-nums"
                />
              </div>
            )}

            <div>
              <label htmlFor="options-premium" className="text-muted-foreground font-medium block mb-1">
                {currentStrategyInfo.isSpread ? "Net Debit per Share ($)" : "Option Premium per Share ($)"}
              </label>
              <input
                id="options-premium"
                type="number"
                step="0.05"
                min="0"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-semibold tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="options-contracts" className="text-muted-foreground font-medium block mb-1">
                Contracts Count (100 shares/contract)
              </label>
              <input
                id="options-contracts"
                type="number"
                step="1"
                min="1"
                max="100"
                value={contracts}
                onChange={(e) => setContracts(e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-semibold tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Payoff Diagram & KPIs */}
        {!payoff ? (
          <div role="alert" className="lg:col-span-2 self-start rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
            <h2 className="font-semibold">Check your trade parameters</h2>
            <p className="mt-2">{analysis.error}</p>
          </div>
        ) : (
        <div className="lg:col-span-2 space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground font-medium block">
                Max Potential Profit
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1 block">
                {payoff.maxProfit === "unlimited" ? "Unlimited ∞" : `$${payoff.maxProfit.toLocaleString()}`}
              </span>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground font-medium block">
                Max Potential Loss
              </span>
              <span className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-1 block">
                {payoff.maxLoss === "unlimited" ? "Unlimited ∞" : `$${payoff.maxLoss.toLocaleString()}`}
              </span>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground font-medium block">
                Breakeven at Expiration
              </span>
              <span className="text-xl font-bold tabular-nums mt-1 block">
                {payoff.breakevens.length ? payoff.breakevens.map((b) => `$${b.toFixed(2)}`).join(", ") : "None"}
              </span>
            </div>
          </div>

          <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-3" aria-label="Target price analysis">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">What if the stock closes at...</h2>
              <Button type="button" variant="outline" size="sm" onClick={exportPayoff}><Download className="h-4 w-4" /> Export payoff CSV</Button>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <label htmlFor="options-expiration-price" className="mb-1 block text-xs text-muted-foreground">Stock price at expiration ($)</label>
                <input id="options-expiration-price" type="number" min="0" step="0.01" value={expirationPrice} onChange={(event) => setExpirationPrice(event.target.value)} aria-invalid={!!scenario.error} aria-describedby={scenario.error ? "scenario-error" : undefined} className="w-40 rounded-xl border bg-background px-3 py-2 text-sm tabular-nums" />
              </div>
              <div aria-live="polite">
                <p className="text-xs text-muted-foreground">Estimated profit / loss</p>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${scenario.pnl !== null && scenario.pnl < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {scenario.pnl === null ? "Unavailable" : scenario.pnl.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </p>
              </div>
            </div>
            {scenario.error && <p id="scenario-error" role="alert" className="text-xs text-destructive">{scenario.error}</p>}
            <p className="text-xs text-muted-foreground">At expiration, with 100 shares per contract. Excludes fees, taxes, and early exercise. Covered calls use the spot price as the share purchase cost.</p>
          </section>

          {/* Payoff Chart */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Profit / Loss at Expiration ($)</h3>
              <span className="text-xs text-muted-foreground">
                Underlying Price Spectrum
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={payoff.points} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="price"
                    type="number"
                    domain={[0, "dataMax"]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                  />
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, "P&L"]}
                    labelFormatter={(label) => `Underlying Stock: $${label}`}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1.5} />
                  <ReferenceLine
                    x={Number(strikePrice)}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    label={{ value: `Strike $${strikePrice}`, fill: "var(--primary)", fontSize: 10, position: "insideTopLeft" }}
                  />
                  {payoff.breakevens.map((value) => <ReferenceLine key={value} x={value} stroke="var(--muted-foreground)" strokeDasharray="2 4" />)}
                  {currentStrategyInfo.isSpread && <ReferenceLine x={Number(secondaryStrike)} stroke="var(--primary)" strokeDasharray="4 4" />}
                  <Line
                    type="linear"
                    dataKey="pnl"
                    stroke="rgb(139, 92, 246)"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
