import { NextResponse, type NextRequest } from "next/server";
import { getCandles } from "@/lib/market/twelvedata";
import { runBacktest, type StrategyType } from "@/lib/backtester";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const strategy = request.nextUrl.searchParams.get("strategy") as StrategyType;
  const initialCapital = parseFloat(request.nextUrl.searchParams.get("initialCapital") ?? "10000");

  if (!symbol || !/^[A-Z0-9.^-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  if (strategy !== "sma_crossover" && strategy !== "rsi_threshold") {
    return NextResponse.json({ error: "invalid strategy" }, { status: 400 });
  }

  if (isNaN(initialCapital) || initialCapital <= 0) {
    return NextResponse.json({ error: "invalid initial capital" }, { status: 400 });
  }

  const smaShort = parseInt(request.nextUrl.searchParams.get("smaShort") ?? "20");
  const smaLong = parseInt(request.nextUrl.searchParams.get("smaLong") ?? "50");
  const rsiPeriod = parseInt(request.nextUrl.searchParams.get("rsiPeriod") ?? "14");
  const rsiOversold = parseInt(request.nextUrl.searchParams.get("rsiOversold") ?? "30");
  const rsiOverbought = parseInt(request.nextUrl.searchParams.get("rsiOverbought") ?? "70");

  try {
    const candles = await getCandles(symbol, "1Y");
    const result = runBacktest({
      candles,
      strategy,
      initialCapital,
      smaShort,
      smaLong,
      rsiPeriod,
      rsiOversold,
      rsiOverbought,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("backtest route failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to run backtest" },
      { status: 502 }
    );
  }
}
