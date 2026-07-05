import { NextResponse, type NextRequest } from "next/server";
import { getCandles, isChartRange } from "@/lib/market/twelvedata";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams
    .get("symbol")
    ?.trim()
    .toUpperCase();
  const range = request.nextUrl.searchParams.get("range") ?? "1D";

  if (!symbol || !/^[A-Z0-9.^-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }
  if (!isChartRange(range)) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  try {
    const candles = await getCandles(symbol, range);
    return NextResponse.json({ candles });
  } catch (err) {
    console.error("candles failed:", err);
    return NextResponse.json(
      { error: "Failed to load chart data" },
      { status: 502 }
    );
  }
}
