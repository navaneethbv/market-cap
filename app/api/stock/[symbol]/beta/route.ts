import { NextResponse, type NextRequest } from "next/server";
import { getQuote, getKeyMetrics, getProfile } from "@/lib/market/finnhub";
import { isValidSymbol } from "@/lib/symbol";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: rawSymbol } = await params;
  let symbol: string;
  try {
    symbol = decodeURIComponent(rawSymbol).trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  try {
    const [quote, metrics, profile] = await Promise.all([
      getQuote(symbol),
      getKeyMetrics(symbol),
      getProfile(symbol),
    ]);

    const beta =
      metrics.beta !== null && Number.isFinite(metrics.beta)
        ? metrics.beta
        : null;

    return NextResponse.json({
      symbol,
      name: profile.name || symbol,
      price: quote.price,
      beta,
    });
  } catch (err) {
    console.error("beta route failed:", err);
    return NextResponse.json(
      { error: "Failed to load asset data" },
      { status: 502 }
    );
  }
}
