import "server-only";
import type { Candle, ChartRange } from "./types";

const BASE = "https://api.twelvedata.com";

const RANGE_CONFIG: Record<
  ChartRange,
  { interval: string; outputsize: number; revalidate: number }
> = {
  "1D": { interval: "5min", outputsize: 78, revalidate: 300 },
  "1W": { interval: "30min", outputsize: 65, revalidate: 900 },
  "1M": { interval: "1h", outputsize: 150, revalidate: 3600 },
  "6M": { interval: "1day", outputsize: 130, revalidate: 3600 },
  "1Y": { interval: "1day", outputsize: 252, revalidate: 3600 },
  "5Y": { interval: "1week", outputsize: 260, revalidate: 86400 },
};

export function isChartRange(value: string): value is ChartRange {
  return value in RANGE_CONFIG;
}

export async function getCandles(
  symbol: string,
  range: ChartRange
): Promise<Candle[]> {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) {
    throw new Error("TWELVEDATA_API_KEY is not set. Add it to .env.local");
  }

  const { interval, outputsize, revalidate } = RANGE_CONFIG[range];
  const qs = new URLSearchParams({
    symbol,
    interval,
    outputsize: String(outputsize),
    timezone: "America/New_York",
    apikey: key,
  });

  const res = await fetch(`${BASE}/time_series?${qs}`, {
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Twelve Data time_series failed: ${res.status}`);
  }

  const raw = (await res.json()) as {
    status?: string;
    message?: string;
    values?: {
      datetime: string;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    }[];
  };

  if (raw.status === "error" || !raw.values) {
    throw new Error(raw.message ?? `No candle data for ${symbol}`);
  }

  // Twelve Data returns newest first; flip to chronological order
  return raw.values
    .map((v) => ({
      time: v.datetime,
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseFloat(v.volume) : 0,
    }))
    .reverse();
}
