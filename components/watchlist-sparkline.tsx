"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

interface SparklineProps {
  symbol: string;
}

interface CandlePoint {
  close: number;
}

export function WatchlistSparkline({ symbol }: SparklineProps) {
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
        if (active && resData.candles) {
          setData(resData.candles.map((c: { close: number }) => ({ close: c.close })));
        }
      })
      .catch(() => {
        // Leave data empty; the chart is not drawn on failure rather than
        // showing fabricated movement
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex h-7 items-center justify-center">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="flex h-7 w-24 items-center justify-center text-xs text-muted-foreground">
        -
      </div>
    );
  }

  const isPositive = data[data.length - 1].close >= data[0].close;
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
