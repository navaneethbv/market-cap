import { NextResponse, type NextRequest } from "next/server";
import { getQuote } from "@/lib/market/finnhub";
import { buildQuotePayload } from "@/lib/quote-response";

const MAX_SYMBOLS = 25;

export async function GET(request: NextRequest) {
  const param =
    request.nextUrl.searchParams.get("symbols") ??
    request.nextUrl.searchParams.get("symbol");
  if (!param) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const symbols = [
    ...new Set(
      param
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.^-]{1,12}$/.test(s))
    ),
  ].slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "no valid symbols" }, { status: 400 });
  }

  const settled = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  const payload = buildQuotePayload(settled);

  return NextResponse.json(payload.body, { status: payload.status });
}
