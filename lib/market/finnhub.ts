import "server-only";
import type {
  CompanyProfile,
  KeyMetrics,
  NewsArticle,
  Quote,
  SymbolSearchResult,
} from "./types";

const BASE = "https://finnhub.io/api/v1";

async function finnhub<T>(
  path: string,
  params: Record<string, string>,
  revalidate: number
): Promise<T> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("FINNHUB_API_KEY is not set. Add it to .env.local");
  }
  const qs = new URLSearchParams({ ...params, token: key });
  const res = await fetch(`${BASE}${path}?${qs}`, { next: { revalidate } });
  if (!res.ok) {
    throw new Error(`Finnhub ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const raw = await finnhub<{
    c: number;
    d: number | null;
    dp: number | null;
    h: number;
    l: number;
    o: number;
    pc: number;
    t: number;
  }>("/quote", { symbol }, 10);

  // Finnhub returns all zeros for unknown symbols
  if (raw.c === 0 && raw.pc === 0 && raw.t === 0) {
    throw new Error(`No quote data for symbol ${symbol}`);
  }

  return {
    symbol,
    price: raw.c,
    change: raw.d ?? 0,
    changePercent: raw.dp ?? 0,
    high: raw.h,
    low: raw.l,
    open: raw.o,
    prevClose: raw.pc,
    timestamp: raw.t,
  };
}

export async function searchSymbols(
  query: string
): Promise<SymbolSearchResult[]> {
  const raw = await finnhub<{
    result: { symbol: string; description: string; type: string }[];
  }>("/search", { q: query, exchange: "US" }, 3600);

  return (raw.result ?? [])
    .filter((r) => r.type === "Common Stock" || r.type === "ETP")
    .slice(0, 8)
    .map((r) => ({
      symbol: r.symbol,
      description: r.description,
      type: r.type,
    }));
}

export async function getProfile(symbol: string): Promise<CompanyProfile> {
  const raw = await finnhub<{
    name?: string;
    ticker?: string;
    exchange?: string;
    finnhubIndustry?: string;
    logo?: string;
    weburl?: string;
    ipo?: string;
    marketCapitalization?: number;
    shareOutstanding?: number;
  }>("/stock/profile2", { symbol }, 86400);

  return {
    symbol,
    name: raw.name ?? symbol,
    exchange: raw.exchange ?? "",
    industry: raw.finnhubIndustry ?? "",
    logo: raw.logo ?? "",
    weburl: raw.weburl ?? "",
    ipo: raw.ipo ?? "",
    marketCap: raw.marketCapitalization ?? 0,
    sharesOutstanding: raw.shareOutstanding ?? 0,
  };
}

export async function getKeyMetrics(symbol: string): Promise<KeyMetrics> {
  const raw = await finnhub<{
    metric?: Record<string, number | null>;
  }>("/stock/metric", { symbol, metric: "all" }, 3600);

  const m = raw.metric ?? {};
  return {
    high52: m["52WeekHigh"] ?? null,
    low52: m["52WeekLow"] ?? null,
    peRatio: m["peBasicExclExtraTTM"] ?? m["peTTM"] ?? null,
    beta: m["beta"] ?? null,
    dividendYield: m["dividendYieldIndicatedAnnual"] ?? null,
    epsTTM: m["epsBasicExclExtraItemsTTM"] ?? m["epsTTM"] ?? null,
  };
}

type RawNews = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  related: string;
};

export async function getCompanyNews(symbol: string): Promise<NewsArticle[]> {
  const to = new Date();
  const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const raw = await finnhub<RawNews[]>(
    "/company-news",
    { symbol, from: fmt(from), to: fmt(to) },
    900
  );
  return (raw ?? []).slice(0, 20);
}

export async function getMarketNews(): Promise<NewsArticle[]> {
  const raw = await finnhub<RawNews[]>("/news", { category: "general" }, 900);
  return (raw ?? []).slice(0, 20);
}
