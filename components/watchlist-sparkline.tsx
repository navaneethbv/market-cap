"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface SparklineProps {
  symbol: string;
  changePercent?: number;
}

interface CandlePoint {
  close: number;
}

function generateMockSparkline(chg: number): CandlePoint[] {
  const points = [100];
  const isUp = chg >= 0;

  for (let i = 1; i < 7; i++) {
    const noise = (Math.random() - 0.48) * 1.5;
    const trend = isUp ? 0.6 : -0.6;
    points.push(points[i - 1] + trend + noise);
  }

  return points.map((p) => ({ close: p }));
}

export function WatchlistSparkline({ symbol, changePercent = 0 }: SparklineProps) {
  const [data, setData] = useState<CandlePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Fetch 1 week candle history
    fetch(`/api/candles?symbol=${symbol}&range=1W`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((resData) => {
        if (active) {
          if (resData.candles && resData.candles.length > 0) {
            setData(resData.candles.map((c: { close: number }) => ({ close: c.close })));
          } else {
            // Simulated fallback based on day change
            setData(generateMockSparkline(changePercent));
          }
        }
      })
      .catch(() => {
        if (active) {
          setData(generateMockSparkline(changePercent));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [symbol, changePercent]);

  if (loading) {
    return (
      <div className="flex h-7 items-center justify-center">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPositive = data.length > 1 ? data[data.length - 1].close >= data[0].close : changePercent >= 0;
  const strokeColor = isPositive ? "#10B981" : "#EF4444"; // Green vs Red

  return (
    <div className="h-7 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
