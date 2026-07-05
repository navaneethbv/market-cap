import { NextResponse, type NextRequest } from "next/server";
import { getQuote, getKeyMetrics, getProfile } from "@/lib/market/finnhub";

const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;

interface MatrixStock {
  symbol: string;
  name: string;
  peRatio: number | null;
  dividendYield: number | null;
  beta: number | null;
  price: number;
  changePercent: number;
  eps: number | null;
}

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = [
    ...new Set(
      symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => SYMBOL_PATTERN.test(s))
    ),
  ].slice(0, 4);

  if (symbols.length === 0) {
    return NextResponse.json({ stocks: [] });
  }

  const settled = await Promise.allSettled(
    symbols.map(async (sym): Promise<MatrixStock> => {
      const [quote, metrics, profile] = await Promise.all([
        getQuote(sym),
        getKeyMetrics(sym),
        getProfile(sym),
      ]);

      return {
        symbol: sym,
        name: profile.name || sym,
        peRatio: metrics.peRatio,
        dividendYield: metrics.dividendYield,
        beta: metrics.beta,
        price: quote.price,
        changePercent: quote.changePercent,
        eps: metrics.epsTTM || null,
      };
    })
  );

  // Unresolved symbols are omitted rather than filled with placeholder data
  const stocks = settled
    .filter(
      (result): result is PromiseFulfilledResult<MatrixStock> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);

  return NextResponse.json({ stocks });
}
