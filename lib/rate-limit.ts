// Public API routes that proxy to external market data providers. These are
// rate limited as a best-effort guard (per instance) against abusive traffic.
export const EXTERNAL_API_PREFIXES = [
  "/api/backtest",
  "/api/candles",
  "/api/compare/matrix",
  "/api/correlation",
  "/api/insiders",
  "/api/quote",
  "/api/screener",
  "/api/search",
  "/api/stock/",
];

/**
 * The rate-limit bucket for a request, or null when the path is not limited.
 * Buckets are keyed by route prefix, not the full path, so a dynamic segment
 * such as the symbol in /api/stock/[symbol]/beta cannot mint a fresh budget.
 */
export function rateLimitBucketKey(pathname: string, ip: string): string | null {
  const prefix = EXTERNAL_API_PREFIXES.find((p) => pathname.startsWith(p));
  return prefix === undefined ? null : `${ip}:${prefix}`;
}
