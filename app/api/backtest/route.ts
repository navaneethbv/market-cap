import { NextResponse, type NextRequest } from "next/server";
import { getCandles } from "@/lib/market/twelvedata";
import {
  normalizeBacktestOptions,
  runBacktest,
  type StrategyType,
} from "@/lib/backtester";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const strategy = request.nextUrl.searchParams.get("strategy") as StrategyType;

  if (!symbol || !/^[A-Z0-9.^-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  if (strategy !== "sma_crossover" && strategy !== "rsi_threshold") {
    return NextResponse.json({ error: "invalid strategy" }, { status: 400 });
  }

  let options;
  try {
    options = normalizeBacktestOptions({
      strategy,
      initialCapital: request.nextUrl.searchParams.get("initialCapital"),
      smaShort: request.nextUrl.searchParams.get("smaShort"),
      smaLong: request.nextUrl.searchParams.get("smaLong"),
      rsiPeriod: request.nextUrl.searchParams.get("rsiPeriod"),
      rsiOversold: request.nextUrl.searchParams.get("rsiOversold"),
      rsiOverbought: request.nextUrl.searchParams.get("rsiOverbought"),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "invalid backtest options" },
      { status: 400 }
    );
  }

  try {
    const candles = await getCandles(symbol, "1Y");
    const result = runBacktest({
      candles,
      strategy,
      ...options,
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
