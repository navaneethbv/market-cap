import { NextResponse, type NextRequest } from "next/server";
import { getCandles } from "@/lib/market/twelvedata";
import { calculateDailyReturns, calculateCorrelationMatrix } from "@/lib/correlation.ts";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9.^-]{1,12}$/.test(s));

  if (symbols.length < 2 || symbols.length > 10) {
    return NextResponse.json(
      { error: "Choose between 2 and 10 valid symbols" },
      { status: 400 }
    );
  }

  try {
    // Fetch candles in parallel
    const candleResults = await Promise.allSettled(
      symbols.map((symbol) => getCandles(symbol, "1Y"))
    );

    const inputs = [];
    const returns: Record<string, { date: string; returnRate: number }[]> = {};

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const result = candleResults[i];
      if (result.status === "fulfilled") {
        inputs.push({ symbol, candles: result.value });
        const dailyReturnsMap = calculateDailyReturns(result.value);
        returns[symbol] = Array.from(dailyReturnsMap.entries()).map(
          ([date, returnRate]) => ({
            date,
            returnRate,
          })
        );
      }
    }

    if (inputs.length < 2) {
      return NextResponse.json(
        { error: "Insufficient market data was loaded" },
        { status: 502 }
      );
    }

    const correlation = calculateCorrelationMatrix(inputs);

    return NextResponse.json({
      matrix: correlation.matrix,
      overlapCounts: correlation.overlapCounts,
      returns,
      symbols: inputs.map((item) => item.symbol),
    });
  } catch (err) {
    console.error("correlation route failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to calculate correlation",
      },
      { status: 502 }
    );
  }
}
