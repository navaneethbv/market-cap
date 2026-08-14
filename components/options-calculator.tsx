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
  type OptionStrategyType,
} from "@/lib/options-payoff";

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
  const [spotPrice, setSpotPrice] = useState<number>(180);
  const [strikePrice, setStrikePrice] = useState<number>(185);
  const [secondaryStrike, setSecondaryStrike] = useState<number>(195);
  const [premium, setPremium] = useState<number>(4.5);
  const [contracts, setContracts] = useState<number>(1);

  const currentStrategyInfo = useMemo(() => {
    return STRATEGIES.find((s) => s.type === strategy) ?? STRATEGIES[0];
  }, [strategy]);

  const payoff = useMemo(() => {
    return calculatePayoffCurve(
      strategy,
      spotPrice,
      strikePrice,
      premium,
      contracts,
      currentStrategyInfo.isSpread ? secondaryStrike : undefined
    );
  }, [strategy, spotPrice, strikePrice, secondaryStrike, premium, contracts, currentStrategyInfo]);

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
              onClick={() => {
                setStrategy(s.type);
                if (s.type === "bull_call_spread") setSecondaryStrike(strikePrice + 10);
                if (s.type === "bear_put_spread") setSecondaryStrike(Math.max(1, strikePrice - 10));
              }}
              className={`rounded-2xl border p-3.5 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
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
          <h2 className="text-base font-semibold">Trade Parameters</h2>

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="options-spot-price" className="text-muted-foreground font-medium block mb-1">
                Underlying Spot Price ($)
              </label>
              <input
                id="options-spot-price"
                type="number"
                step="0.5"
                min="1"
                value={spotPrice}
                onChange={(e) => setSpotPrice(Number(e.target.value) || 1)}
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
                min="1"
                value={strikePrice}
                onChange={(e) => setStrikePrice(Number(e.target.value) || 1)}
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
                  min="1"
                  value={secondaryStrike}
                  onChange={(e) => setSecondaryStrike(Number(e.target.value) || 1)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-semibold tabular-nums"
                />
              </div>
            )}

            <div>
              <label htmlFor="options-premium" className="text-muted-foreground font-medium block mb-1">
                Option Premium per Share ($)
              </label>
              <input
                id="options-premium"
                type="number"
                step="0.05"
                min="0.01"
                value={premium}
                onChange={(e) => setPremium(Number(e.target.value) || 0.01)}
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
                onChange={(e) => setContracts(Number(e.target.value) || 1)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-semibold tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Payoff Diagram & KPIs */}
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
                {payoff.breakevens.map((b) => `$${b.toFixed(2)}`).join(", ")}
              </span>
            </div>
          </div>

          {/* Payoff Chart */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
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
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => `$${v}`}
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
                    x={strikePrice}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    label={{ value: `Strike $${strikePrice}`, fill: "var(--primary)", fontSize: 10, position: "top" }}
                  />
                  <Line
                    type="monotone"
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
      </div>
    </div>
  );
}
