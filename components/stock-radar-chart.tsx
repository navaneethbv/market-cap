"use client";

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
import {
  buildRadarComparisonData,
  type StockDimensionScores,
} from "@/lib/stock-radar";

const RADAR_COLORS = [
  "rgb(139, 92, 246)", // violet
  "rgb(16, 185, 129)", // emerald
  "rgb(59, 130, 246)", // blue
  "rgb(245, 158, 11)", // amber
  "rgb(236, 72, 153)", // pink
];

export function StockRadarChart({
  scores,
}: Readonly<{
  scores: readonly StockDimensionScores[];
}>) {
  if (scores.length === 0) return null;

  const data = buildRadarComparisonData(scores);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-semibold">Multi-Factor Factor Radar</h2>
        <p className="text-xs text-muted-foreground">
          Normalized comparison across Valuation, Profitability, Growth, Momentum, and Stability (Score 0-100).
        </p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="var(--border)" strokeOpacity={0.6} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: "0.75rem",
                fontSize: "0.75rem",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
            {scores.map((s, idx) => {
              const color = RADAR_COLORS[idx % RADAR_COLORS.length];
              return (
                <Radar
                  key={s.symbol}
                  name={s.symbol}
                  dataKey={s.symbol}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              );
            })}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
