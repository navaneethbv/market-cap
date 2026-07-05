// The .ts extension keeps this import resolvable by the node --test runner,
// which executes these files with type stripping and no bundler resolution
import { formatCompact, formatPriceOrDash } from "./format.ts";
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
    { label: "Open", value: formatPriceOrDash(quote.open) },
    { label: "Day high", value: formatPriceOrDash(quote.high) },
    { label: "Day low", value: formatPriceOrDash(quote.low) },
    { label: "Prev close", value: formatPriceOrDash(quote.prevClose) },
    {
      label: "Market cap",
      value: formatCompact(profile.marketCap * 1_000_000),
    },
    { label: "P/E ratio", value: formatMetric(metrics.peRatio) },
    { label: "52w high", value: formatPriceOrDash(metrics.high52 ?? 0) },
    { label: "52w low", value: formatPriceOrDash(metrics.low52 ?? 0) },
    {
      label: "Dividend yield",
      value: formatMetric(metrics.dividendYield, "%"),
    },
    { label: "Beta", value: formatMetric(metrics.beta) },
    {
      label: "EPS",
      value: metrics.epsTTM === null ? "-" : formatPriceOrDash(metrics.epsTTM),
    },
  ];
}

export function getChartTone(candles: Candle[]): ChartTone {
  const first = candles[0]?.close ?? 0;
  const last = candles.at(-1)?.close ?? first;
  return last >= first ? "up" : "down";
}
