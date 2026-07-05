"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";

interface DCFCalculatorProps {
  currentPrice: number;
  initialEps: number | null;
}

function computeDCF(eps: number, growth: number, discount: number, terminal: number): number {
  const g = growth / 100;
  const d = discount / 100;
  const tg = terminal / 100;
  const effectiveD = d <= tg ? tg + 0.01 : d;

  let pvSum = 0;
  let epsT = eps;

  for (let t = 1; t <= 5; t++) {
    epsT = epsT * (1 + g);
    const pv = epsT / Math.pow(1 + effectiveD, t);
    pvSum += pv;
  }

  const terminalValue = (epsT * (1 + tg)) / (effectiveD - tg);
  const pvTerminalValue = terminalValue / Math.pow(1 + effectiveD, 5);
  return pvSum + pvTerminalValue;
}

export function DCFCalculator({ currentPrice, initialEps }: DCFCalculatorProps) {
  const eps = initialEps !== null && initialEps > 0 ? initialEps : 5.0;

  // Sliders state
  const [growthRate, setGrowthRate] = useState(10);
  const [discountRate, setDiscountRate] = useState(9);
  const [terminalGrowth, setTerminalGrowth] = useState(2.5);

  const { intrinsicValue, safetyMargin, status, chartData } = useMemo(() => {
    const baseValue = computeDCF(eps, growthRate, discountRate, terminalGrowth);
    
    // Bull: +4% growth, -1% WACC
    const bullValue = computeDCF(eps, Math.min(30, growthRate + 4), Math.max(5, discountRate - 1), terminalGrowth);
    
    // Bear: -4% growth, +1.5% WACC
    const bearValue = computeDCF(eps, Math.max(1, growthRate - 4), Math.min(18, discountRate + 1.5), terminalGrowth);

    const diff = baseValue - currentPrice;
    const safetyMargin = baseValue === 0 ? 0 : Math.round((diff / baseValue) * 100);

    const status = baseValue >= currentPrice ? "UNDER" : "OVER";

    const chartData = [
      { name: "Bear Case", value: Math.round(bearValue * 100) / 100, fill: "rgba(239, 68, 68, 0.85)" },
      { name: "Current Price", value: Math.round(currentPrice * 100) / 100, fill: "rgba(107, 114, 128, 0.85)" },
      { name: "Base Case", value: Math.round(baseValue * 100) / 100, fill: "rgba(139, 92, 246, 0.85)" },
      { name: "Bull Case", value: Math.round(bullValue * 100) / 100, fill: "rgba(16, 185, 129, 0.85)" },
    ];

    return {
      intrinsicValue: baseValue,
      safetyMargin: Math.abs(safetyMargin),
      status,
      chartData,
    };
  }, [eps, currentPrice, growthRate, discountRate, terminalGrowth]);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary fill-current" />
            Intrinsic Value Calculator (DCF)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adjust growth projections and discount rates to calculate per-share fair value.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted border">
          Current: <span className="tabular-nums">{formatPrice(currentPrice)}</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Sliders */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-muted-foreground">5Y Growth Rate (EPS)</span>
              <span className="text-foreground tabular-nums">{growthRate}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={growthRate}
              onChange={(e) => setGrowthRate(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[10px] text-muted-foreground">Average annual growth rate for the next 5 years.</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-muted-foreground">Discount Rate (WACC)</span>
              <span className="text-foreground tabular-nums">{discountRate}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="18"
              step="0.5"
              value={discountRate}
              onChange={(e) => setDiscountRate(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[10px] text-muted-foreground">Required rate of return based on risk profile.</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-muted-foreground">Terminal Growth Rate</span>
              <span className="text-foreground tabular-nums">{terminalGrowth}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={terminalGrowth}
              onChange={(e) => setTerminalGrowth(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[10px] text-muted-foreground">Long-term growth rate beyond year 5 (GDP matching).</p>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="flex flex-col justify-between rounded-xl border bg-muted/10 p-4 space-y-4">
          <div className="text-center py-2 space-y-1">
            <h4 className="text-xs font-bold text-muted-foreground uppercase">Estimated Fair Value</h4>
            <div className="text-3xl font-extrabold tabular-nums text-foreground">
              {formatPrice(intrinsicValue)}
            </div>
          </div>

          <div className="border-t pt-3 flex flex-col items-center text-center space-y-2">
            <h5 className="text-xs font-bold text-muted-foreground">Valuation Verdict</h5>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-extrabold border shadow-inner",
                status === "UNDER"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              )}
            >
              {status === "UNDER" ? "Under-valued" : "Over-valued"} by {safetyMargin}%
            </span>
            <p className="text-[11px] leading-normal text-muted-foreground font-semibold max-w-xs mt-1">
              {status === "UNDER"
                ? `The stock has a positive margin of safety of ${safetyMargin}%, indicating it may be trading below its calculated fair value.`
                : `The stock is trading at a premium of ${safetyMargin}% above its calculated fair value based on these growth inputs.`}
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Bar Chart */}
      <div className="border-t pt-5 space-y-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase">Scenario Analysis</h4>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: "bold" }}
              />
              <YAxis
                tickFormatter={(val) => `$${val}`}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const val = Number(payload[0].value);
                  const name = String(payload[0].payload.name);
                  return (
                    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg space-y-0.5">
                      <div className="font-semibold text-muted-foreground">{name}</div>
                      <div className="font-extrabold text-foreground">
                        Value: {formatPrice(val)}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
