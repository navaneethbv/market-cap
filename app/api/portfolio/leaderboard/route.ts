import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuote } from "@/lib/market/finnhub";
import { compileLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";

const MOCK_COMPETITORS: LeaderboardEntry[] = [
  { name: "Nancy Pelosi Tracker 🇺🇸", valuation: 165420, returnPercent: 65.42, isUser: false },
  { name: "Alpha Whale 🐳", valuation: 142500, returnPercent: 42.50, isUser: false },
  { name: "Macro Master 📈", valuation: 118900, returnPercent: 18.90, isUser: false },
  { name: "Retail Diamond Hands 💎", valuation: 105200, returnPercent: 5.20, isUser: false },
];

const DEFAULT_PRICES: Record<string, number> = {
  AAPL: 210.0,
  MSFT: 420.0,
  KO: 62.0,
  WMT: 68.0,
  TSLA: 220.0,
  AMZN: 185.0,
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch cash balance
    const { data: pData, error: pError } = await supabase
      .from("paper_portfolios")
      .select("cash_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (pError) throw new Error(pError.message);
    const cash = pData ? Number(pData.cash_balance) : 100000.00;

    // 2. Fetch paper holdings
    const { data: holdingsData, error: hError } = await supabase
      .from("paper_holdings")
      .select("symbol,shares")
      .eq("user_id", user.id);

    if (hError) throw new Error(hError.message);
    const holdings = holdingsData ?? [];

    // 3. Resolve quotes
    let totalStockValue = 0;
    if (holdings.length > 0) {
      const quotes = await Promise.allSettled(
        holdings.map(async (h) => {
          try {
            const q = await getQuote(h.symbol);
            return { symbol: h.symbol, price: q.price };
          } catch {
            const fallback = DEFAULT_PRICES[h.symbol] ?? 100.0;
            return { symbol: h.symbol, price: fallback };
          }
        })
      );

      quotes.forEach((res, index) => {
        const shares = Number(holdings[index].shares);
        if (res.status === "fulfilled") {
          totalStockValue += shares * res.value.price;
        } else {
          const fallbackPrice = DEFAULT_PRICES[holdings[index].symbol] ?? 100.0;
          totalStockValue += shares * fallbackPrice;
        }
      });
    }

    const totalValuation = cash + totalStockValue;
    const { leaderboard, userRank } = compileLeaderboard(MOCK_COMPETITORS, totalValuation);

    return NextResponse.json({
      leaderboard,
      userRank,
      userValuation: totalValuation,
    });
  } catch (err) {
    console.error("Leaderboard calculation failed:", err);
    return NextResponse.json({ error: "Failed to compile leaderboard" }, { status: 500 });
  }
}
