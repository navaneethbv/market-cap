import { NextResponse } from "next/server";
import { getQuote, getKeyMetrics, getProfile } from "@/lib/market/finnhub";
import { SCREENER_CATALOG, type ScreenerStock } from "@/lib/screener";

const FALLBACK_METRICS: Record<
  string,
  {
    marketCap: number;
    peRatio: number | null;
    dividendYield: number | null;
    beta: number | null;
    price: number;
    change: number;
    changePercent: number;
  }
> = {
  AAPL: { marketCap: 3020, peRatio: 28.5, dividendYield: 0.54, beta: 1.15, price: 182.52, change: 2.25, changePercent: 1.25 },
  MSFT: { marketCap: 3150, peRatio: 35.2, dividendYield: 0.72, beta: 0.90, price: 420.55, change: 3.55, changePercent: 0.85 },
  NVDA: { marketCap: 2200, peRatio: 72.8, dividendYield: 0.02, beta: 1.68, price: 875.12, change: 28.90, changePercent: 3.42 },
  AMD: { marketCap: 280, peRatio: 58.4, dividendYield: 0.00, beta: 1.55, price: 178.20, change: 3.75, changePercent: 2.15 },
  INTC: { marketCap: 155, peRatio: 32.1, dividendYield: 1.28, beta: 1.05, price: 34.50, change: -0.32, changePercent: -0.92 },
  AMZN: { marketCap: 1850, peRatio: 41.5, dividendYield: 0.00, beta: 1.14, price: 175.35, change: 1.95, changePercent: 1.12 },
  TSLA: { marketCap: 560, peRatio: 58.2, dividendYield: 0.00, beta: 1.52, price: 170.18, change: -4.28, changePercent: -2.45 },
  MCD: { marketCap: 198, peRatio: 22.4, dividendYield: 2.35, beta: 0.65, price: 275.40, change: 0.40, changePercent: 0.15 },
  NKE: { marketCap: 135, peRatio: 26.8, dividendYield: 1.58, beta: 0.98, price: 88.50, change: -1.08, changePercent: -1.20 },
  HD: { marketCap: 360, peRatio: 21.2, dividendYield: 2.48, beta: 0.92, price: 355.20, change: 1.95, changePercent: 0.55 },
  GOOGL: { marketCap: 1900, peRatio: 25.4, dividendYield: 0.45, beta: 1.08, price: 150.22, change: 2.40, changePercent: 1.62 },
  META: { marketCap: 1250, peRatio: 28.2, dividendYield: 0.42, beta: 1.22, price: 495.30, change: 10.20, changePercent: 2.10 },
  NFLX: { marketCap: 260, peRatio: 38.6, dividendYield: 0.00, beta: 1.28, price: 610.15, change: 8.12, changePercent: 1.35 },
  JPM: { marketCap: 550, peRatio: 11.8, dividendYield: 2.65, beta: 1.02, price: 195.40, change: -0.88, changePercent: -0.45 },
  BAC: { marketCap: 295, peRatio: 10.4, dividendYield: 2.82, beta: 1.12, price: 37.20, change: -0.24, changePercent: -0.65 },
  V: { marketCap: 580, peRatio: 32.1, dividendYield: 0.78, beta: 0.94, price: 278.50, change: 2.00, changePercent: 0.72 },
  MA: { marketCap: 420, peRatio: 35.8, dividendYield: 0.62, beta: 1.05, price: 450.25, change: 4.25, changePercent: 0.95 },
  WMT: { marketCap: 480, peRatio: 27.5, dividendYield: 1.38, beta: 0.52, price: 60.12, change: 0.21, changePercent: 0.35 },
  COST: { marketCap: 325, peRatio: 45.2, dividendYield: 0.58, beta: 0.78, price: 725.50, change: 8.25, changePercent: 1.15 },
  PG: { marketCap: 395, peRatio: 24.8, dividendYield: 2.52, beta: 0.44, price: 162.20, change: 0.45, changePercent: 0.28 },
  KO: { marketCap: 265, peRatio: 23.1, dividendYield: 3.12, beta: 0.58, price: 61.50, change: 0.07, changePercent: 0.12 },
  PEP: { marketCap: 230, peRatio: 21.8, dividendYield: 2.95, beta: 0.56, price: 168.30, change: -0.37, changePercent: -0.22 },
  LLY: { marketCap: 720, peRatio: 112.5, dividendYield: 0.68, beta: 0.85, price: 760.10, change: 21.00, changePercent: 2.85 },
  JNJ: { marketCap: 375, peRatio: 15.4, dividendYield: 3.15, beta: 0.54, price: 155.80, change: -0.23, changePercent: -0.15 },
  UNH: { marketCap: 440, peRatio: 18.2, dividendYield: 1.58, beta: 0.68, price: 475.20, change: -2.00, changePercent: -0.42 },
  ABBV: { marketCap: 310, peRatio: 14.8, dividendYield: 3.65, beta: 0.58, price: 175.40, change: 1.42, changePercent: 0.82 },
  XOM: { marketCap: 485, peRatio: 12.5, dividendYield: 3.25, beta: 1.05, price: 120.30, change: 1.72, changePercent: 1.45 },
  CVX: { marketCap: 295, peRatio: 11.8, dividendYield: 4.12, beta: 1.12, price: 158.40, change: 1.50, changePercent: 0.95 },
  CAT: { marketCap: 180, peRatio: 15.8, dividendYield: 1.52, beta: 1.15, price: 350.15, change: 4.22, changePercent: 1.22 },
  GE: { marketCap: 170, peRatio: 28.4, dividendYield: 0.58, beta: 1.22, price: 156.40, change: 2.85, changePercent: 1.85 },
};

export async function GET() {
  const HAS_FINNHUB_KEY = Boolean(process.env.FINNHUB_API_KEY);

  // If no API key, return fallbacks immediately
  if (!HAS_FINNHUB_KEY) {
    const stocks: ScreenerStock[] = SCREENER_CATALOG.map((cat) => {
      const fb = FALLBACK_METRICS[cat.symbol];
      return {
        symbol: cat.symbol,
        name: cat.name,
        sector: cat.sector,
        ...fb,
      };
    });
    return NextResponse.json({ stocks });
  }

  try {
    const promises = SCREENER_CATALOG.map(async (cat) => {
      try {
        const [quote, metrics, profile] = await Promise.all([
          getQuote(cat.symbol),
          getKeyMetrics(cat.symbol),
          getProfile(cat.symbol),
        ]);

        return {
          symbol: cat.symbol,
          name: cat.name,
          sector: cat.sector,
          marketCap: profile.marketCap ? Math.round(profile.marketCap / 1000) : FALLBACK_METRICS[cat.symbol].marketCap,
          peRatio: metrics.peRatio,
          dividendYield: metrics.dividendYield,
          beta: metrics.beta,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
        };
      } catch {
        // Fallback for individual symbol failures
        const fb = FALLBACK_METRICS[cat.symbol];
        return {
          symbol: cat.symbol,
          name: cat.name,
          sector: cat.sector,
          ...fb,
        };
      }
    });

    const stocks = await Promise.all(promises);
    return NextResponse.json({ stocks });
  } catch (err) {
    console.error("Screener GET endpoint failed:", err);
    // Ultimate fallback for entire API crash
    const stocks: ScreenerStock[] = SCREENER_CATALOG.map((cat) => {
      const fb = FALLBACK_METRICS[cat.symbol];
      return {
        symbol: cat.symbol,
        name: cat.name,
        sector: cat.sector,
        ...fb,
      };
    });
    return NextResponse.json({ stocks });
  }
}
