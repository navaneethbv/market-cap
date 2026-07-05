import type {
  Candle,
  CompanyProfile,
  KeyMetrics,
  Quote,
} from "./market/types";

export interface StockStat {
  label: string;
  value: string;
}

export type ChartTone = "up" | "down";

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "-";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompact(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "-";
  return `$${Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatMetric(value: number | null, suffix = ""): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`;
}

export function buildStockStats({
  quote,
  profile,
  metrics,
}: {
  quote: Quote;
  profile: CompanyProfile;
  metrics: KeyMetrics;
}): StockStat[] {
  return [
    { label: "Open", value: formatPrice(quote.open) },
    { label: "Day high", value: formatPrice(quote.high) },
    { label: "Day low", value: formatPrice(quote.low) },
    { label: "Prev close", value: formatPrice(quote.prevClose) },
    {
      label: "Market cap",
      value: formatCompact(profile.marketCap * 1_000_000),
    },
    { label: "P/E ratio", value: formatMetric(metrics.peRatio) },
    { label: "52w high", value: formatPrice(metrics.high52 ?? 0) },
    { label: "52w low", value: formatPrice(metrics.low52 ?? 0) },
    {
      label: "Dividend yield",
      value: formatMetric(metrics.dividendYield, "%"),
    },
    { label: "Beta", value: formatMetric(metrics.beta) },
    {
      label: "EPS",
      value: metrics.epsTTM === null ? "-" : formatPrice(metrics.epsTTM),
    },
  ];
}

export function getChartTone(candles: Candle[]): ChartTone {
  const first = candles[0]?.close ?? 0;
  const last = candles.at(-1)?.close ?? first;
  return last >= first ? "up" : "down";
}
