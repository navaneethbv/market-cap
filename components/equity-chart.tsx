"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/lib/format";

// date is a YYYY-MM-DD string from the paper_equity_snapshots date column
export interface EquityPoint {
  date: string;
  equity: number;
}

function formatTick(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function EquityChart({ points }: { points: EquityPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        No equity history yet. Place a trade on the trading page to start
        tracking your balance.
      </div>
    );
  }

  const first = points[0].equity;
  const last = points[points.length - 1].equity;
  const stroke = last >= first ? "rgb(16 185 129)" : "rgb(239 68 68)";

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equity-chart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            domain={["dataMin", "dataMax"]}
            orientation="right"
            tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(1)}k`}
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke, strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
                  <div className="font-semibold text-foreground">
                    {formatPrice(Number(payload[0].value))}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {formatTick(String(label))}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={2.5}
            fill="url(#equity-chart)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
