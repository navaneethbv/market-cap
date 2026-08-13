import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server.ts";
import { getInsiderTransactions } from "@/lib/market/finnhub";
import type { InsiderTransaction } from "@/lib/market/types";
import { isValidSymbol } from "@/lib/symbol";
import { parseDateTimestamp } from "@/lib/parse";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const watchlistParam = request.nextUrl.searchParams.get("watchlist") === "true";

  try {
    let targetSymbols: string[] = [];

    if (symbol) {
      if (!isValidSymbol(symbol)) {
        return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
      }
      const transactions = await getInsiderTransactions(symbol);
      return NextResponse.json({ transactions });
    }

    if (watchlistParam) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: items, error } = await supabase
        .from("watchlist_items")
        .select("symbol")
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message);
      }

      targetSymbols = (items ?? []).map((i) => i.symbol);
      if (targetSymbols.length === 0) {
        return NextResponse.json({ transactions: [], message: "No watchlisted symbols found" });
      }
    } else {
      // Default trending basket if no query is set
      targetSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
    }

    // Fetch transactions in parallel
    const results = await Promise.allSettled(
      targetSymbols.map((s) => getInsiderTransactions(s))
    );

    const allTransactions: InsiderTransaction[] = [];
    results.forEach((res) => {
      if (res.status === "fulfilled") {
        allTransactions.push(...res.value);
      }
    });

    // Sort by transaction date descending; malformed dates sort last
    allTransactions.sort(
      (a, b) => parseDateTimestamp(b.date) - parseDateTimestamp(a.date)
    );

    // Limit to 50 items
    const limited = allTransactions.slice(0, 50);

    return NextResponse.json({ transactions: limited });
  } catch (err) {
    console.error("insiders route failed:", err);
    return NextResponse.json(
      { error: "Failed to load insider activity" },
      { status: 502 }
    );
  }
}
