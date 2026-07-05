import { NextResponse, type NextRequest } from "next/server";
import { getCandles } from "@/lib/market/twelvedata";
import { getProfile } from "@/lib/market/finnhub";
import { calculateCorrelation, getMockHistoricalPrices } from "@/lib/correlation";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0)
    .slice(0, 4);

  if (symbols.length === 0) {
    return NextResponse.json({ symbols: [], matrix: [], profiles: {} });
  }

  const HAS_TWELVEDATA_KEY = Boolean(process.env.TWELVEDATA_API_KEY);
  const HAS_FINNHUB_KEY = Boolean(process.env.FINNHUB_API_KEY);

  try {
    // 1. Fetch profiles and price series in parallel
    const resolvedData = await Promise.all(
      symbols.map(async (sym) => {
        // Resolve profile
        let name = sym;
        let logo = "";
        if (HAS_FINNHUB_KEY) {
          try {
            const p = await getProfile(sym);
            name = p.name;
            logo = p.logo;
          } catch {
            // Keep default name
          }
        }

        // Resolve series
        let prices: number[] = [];
        if (HAS_TWELVEDATA_KEY) {
          try {
            const candles = await getCandles(sym, "1M");
            // Extract last 10 closing prices
            prices = candles.slice(-10).map((c) => c.close);
          } catch {
            prices = getMockHistoricalPrices(sym);
          }
        } else {
          prices = getMockHistoricalPrices(sym);
        }

        return { symbol: sym, name, logo, prices };
      })
    );

    // 2. Build the correlation matrix
    const size = resolvedData.length;
    const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          matrix[i][j] = calculateCorrelation(resolvedData[i].prices, resolvedData[j].prices);
        }
      }
    }

    // 3. Prepare profiles mapping
    const profiles: Record<string, { name: string; logo: string }> = {};
    resolvedData.forEach((d) => {
      profiles[d.symbol] = { name: d.name, logo: d.logo };
    });

    return NextResponse.json({
      symbols,
      matrix,
      profiles,
    });
  } catch (err) {
    console.error("Correlation API resolution failed:", err);
    return NextResponse.json({ error: "Failed to compute correlation" }, { status: 500 });
  }
}
