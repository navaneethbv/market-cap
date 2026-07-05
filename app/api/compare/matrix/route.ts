import { NextResponse, type NextRequest } from "next/server";
import { getQuote, getKeyMetrics, getProfile } from "@/lib/market/finnhub";

const FALLBACK_METRICS: Record<
  string,
  {
    name: string;
    peRatio: number | null;
    dividendYield: number | null;
    beta: number | null;
    price: number;
    changePercent: number;
    eps: number | null;
  }
> = {
  AAPL: { name: "Apple Inc.", peRatio: 28.5, dividendYield: 0.54, beta: 1.15, price: 182.52, changePercent: 1.25, eps: 6.12 },
  MSFT: { name: "Microsoft Corp.", peRatio: 35.2, dividendYield: 0.72, beta: 0.90, price: 420.55, changePercent: 0.85, eps: 11.60 },
  NVDA: { name: "Nvidia Corp.", peRatio: 72.8, dividendYield: 0.02, beta: 1.68, price: 875.12, changePercent: 3.42, eps: 12.02 },
  AMD: { name: "Advanced Micro Devices", peRatio: 58.4, dividendYield: 0.00, beta: 1.55, price: 178.20, changePercent: 2.15, eps: 2.95 },
  INTC: { name: "Intel Corp.", peRatio: 32.1, dividendYield: 1.28, beta: 1.05, price: 34.50, changePercent: -0.92, eps: 1.07 },
  AMZN: { name: "Amazon.com Inc.", peRatio: 41.5, dividendYield: 0.00, beta: 1.14, price: 175.35, changePercent: 1.12, eps: 4.22 },
  TSLA: { name: "Tesla Inc.", peRatio: 58.2, dividendYield: 0.00, beta: 1.52, price: 170.18, changePercent: -2.45, eps: 3.10 },
  MCD: { name: "McDonald's Corp.", peRatio: 22.4, dividendYield: 2.35, beta: 0.65, price: 275.40, changePercent: 0.15, eps: 11.50 },
  NKE: { name: "Nike Inc.", peRatio: 26.8, dividendYield: 1.58, beta: 0.98, price: 88.50, changePercent: -1.20, eps: 3.45 },
  HD: { name: "Home Depot Inc.", peRatio: 21.2, dividendYield: 2.48, beta: 0.92, price: 355.20, changePercent: 0.55, eps: 15.20 },
  GOOGL: { name: "Alphabet Inc.", peRatio: 25.4, dividendYield: 0.45, beta: 1.08, price: 150.22, changePercent: 1.62, eps: 5.80 },
  META: { name: "Meta Platforms", peRatio: 28.2, dividendYield: 0.42, beta: 1.22, price: 495.30, changePercent: 2.10, eps: 14.85 },
  NFLX: { name: "Netflix Inc.", peRatio: 38.6, dividendYield: 0.00, beta: 1.28, price: 610.15, changePercent: 1.35, eps: 12.11 },
  JPM: { name: "JPMorgan Chase", peRatio: 11.8, dividendYield: 2.65, beta: 1.02, price: 195.40, changePercent: -0.45, eps: 16.20 },
  BAC: { name: "Bank of America", peRatio: 10.4, dividendYield: 2.82, beta: 1.12, price: 37.20, changePercent: -0.65, eps: 3.42 },
  V: { name: "Visa Inc.", peRatio: 32.1, dividendYield: 0.78, beta: 0.94, price: 278.50, changePercent: 0.72, eps: 8.65 },
  MA: { name: "Mastercard Inc.", peRatio: 35.8, dividendYield: 0.62, beta: 1.05, price: 450.25, changePercent: 0.95, eps: 12.20 },
  WMT: { name: "Walmart Inc.", peRatio: 27.5, dividendYield: 1.38, beta: 0.52, price: 60.12, changePercent: 0.35, eps: 2.22 },
  COST: { name: "Costco Wholesale", peRatio: 45.2, dividendYield: 0.58, beta: 0.78, price: 725.50, changePercent: 1.15, eps: 14.25 },
  PG: { name: "Procter & Gamble", peRatio: 24.8, dividendYield: 2.52, beta: 0.44, price: 162.20, changePercent: 0.28, eps: 6.55 },
  KO: { name: "Coca-Cola Co.", peRatio: 23.1, dividendYield: 3.12, beta: 0.58, price: 61.50, changePercent: 0.12, eps: 2.68 },
  PEP: { name: "PepsiCo Inc.", peRatio: 21.8, dividendYield: 2.95, beta: 0.56, price: 168.30, changePercent: -0.22, eps: 7.25 },
  LLY: { name: "Eli Lilly & Co.", peRatio: 112.5, dividendYield: 0.68, beta: 0.85, price: 760.10, changePercent: 2.85, eps: 6.32 },
  JNJ: { name: "Johnson & Johnson", peRatio: 15.4, dividendYield: 3.15, beta: 0.54, price: 155.80, changePercent: -0.15, eps: 9.20 },
  UNH: { name: "UnitedHealth Group", peRatio: 18.2, dividendYield: 1.58, beta: 0.68, price: 475.20, changePercent: -0.42, eps: 25.12 },
  ABBV: { name: "AbbVie Inc.", peRatio: 14.8, dividendYield: 3.65, beta: 0.58, price: 175.40, changePercent: 0.82, eps: 11.10 },
  XOM: { name: "Exxon Mobil Corp.", peRatio: 12.5, dividendYield: 3.25, beta: 1.05, price: 120.30, changePercent: 1.45, eps: 9.50 },
  CVX: { name: "Chevron Corp.", peRatio: 11.8, dividendYield: 4.12, beta: 1.12, price: 158.40, changePercent: 0.95, eps: 13.12 },
  CAT: { name: "Caterpillar Inc.", peRatio: 15.8, dividendYield: 1.52, beta: 1.15, price: 350.15, changePercent: 1.22, eps: 21.20 },
  GE: { name: "General Electric", peRatio: 28.4, dividendYield: 0.58, beta: 1.22, price: 156.40, changePercent: 1.85, eps: 5.40 },
};

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0)
    .slice(0, 4);

  if (symbols.length === 0) {
    return NextResponse.json({ stocks: [] });
  }

  const HAS_FINNHUB_KEY = Boolean(process.env.FINNHUB_API_KEY);

  if (!HAS_FINNHUB_KEY) {
    const stocks = symbols.map((sym) => {
      const fb = FALLBACK_METRICS[sym] ?? {
        name: `${sym} Inc.`,
        peRatio: 20.0,
        dividendYield: 1.5,
        beta: 1.0,
        price: 100.0,
        changePercent: 0.0,
        eps: 5.0,
      };
      return { symbol: sym, ...fb };
    });
    return NextResponse.json({ stocks });
  }

  try {
    const promises = symbols.map(async (sym) => {
      try {
        const [quote, metrics, profile] = await Promise.all([
          getQuote(sym),
          getKeyMetrics(sym),
          getProfile(sym),
        ]);

        return {
          symbol: sym,
          name: profile.name || sym,
          peRatio: metrics.peRatio,
          dividendYield: metrics.dividendYield,
          beta: metrics.beta,
          price: quote.price,
          changePercent: quote.changePercent,
          eps: metrics.epsTTM || null,
        };
      } catch {
        const fb = FALLBACK_METRICS[sym] ?? {
          name: `${sym} Inc.`,
          peRatio: 20.0,
          dividendYield: 1.5,
          beta: 1.0,
          price: 100.0,
          changePercent: 0.0,
          eps: 5.0,
        };
        return { symbol: sym, ...fb };
      }
    });

    const stocks = await Promise.all(promises);
    return NextResponse.json({ stocks });
  } catch (err) {
    console.error("Compare matrix GET failed:", err);
    return NextResponse.json({ error: "Failed to resolve comparison data" }, { status: 500 });
  }
}
