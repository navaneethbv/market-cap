import { NextResponse, type NextRequest } from "next/server";
import { getCandles, isChartRange } from "@/lib/market/twelvedata";
import { calculatePortfolioHistory } from "@/lib/portfolio-history";
import type { Holding } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = request.nextUrl.searchParams.get("range") ?? "1M";
  if (!isChartRange(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  try {
    const { data: holdingsData, error: holdingsError } = await supabase
      .from("holdings")
      .select("id,symbol,shares,avg_cost,purchased_at,created_at")
      .eq("user_id", user.id);

    if (holdingsError) {
      throw new Error(holdingsError.message);
    }

    const holdings = (holdingsData ?? []).map((holding) => ({
      ...holding,
      shares: Number(holding.shares),
      avg_cost: Number(holding.avg_cost),
    })) as Holding[];

    if (holdings.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const uniqueSymbols = Array.from(new Set(holdings.map((h) => h.symbol)));

    const candleResults = await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        try {
          const candles = await getCandles(symbol, range);
          return { symbol, candles };
        } catch (err) {
          console.error(`Failed to fetch candles for ${symbol}:`, err);
          return { symbol, candles: [] };
        }
      })
    );

    const candlesMap = candleResults.reduce(
      (acc, curr) => {
        acc[curr.symbol] = curr.candles;
        return acc;
      },
      {} as Record<string, typeof candleResults[number]["candles"]>
    );

    const history = calculatePortfolioHistory(holdings, candlesMap);
    return NextResponse.json({ history });
  } catch (err) {
    console.error("portfolio history failed:", err);
    return NextResponse.json(
      { error: "Failed to load portfolio history" },
      { status: 500 }
    );
  }
}
