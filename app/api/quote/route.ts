import { NextResponse, type NextRequest } from "next/server";
import { getQuote } from "@/lib/market/finnhub";
import { buildQuotePayload } from "@/lib/quote-response";
import { splitSymbols } from "@/lib/symbol";

const MAX_SYMBOLS = 25;

export async function GET(request: NextRequest) {
  const param =
    request.nextUrl.searchParams.get("symbols") ??
    request.nextUrl.searchParams.get("symbol");
  if (!param) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const symbols = splitSymbols(param, MAX_SYMBOLS);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "no valid symbols" }, { status: 400 });
  }

  const settled = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  const payload = buildQuotePayload(settled);

  return NextResponse.json(payload.body, { status: payload.status });
}
