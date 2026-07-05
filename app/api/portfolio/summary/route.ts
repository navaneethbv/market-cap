import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server.ts";
import { getQuote, getKeyMetrics } from "@/lib/market/finnhub";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: holdingsData, error: holdingsError } = await supabase
      .from("holdings")
      .select("symbol,shares,avg_cost")
      .eq("user_id", user.id);

    if (holdingsError) {
      throw new Error(holdingsError.message);
    }

    if (!holdingsData || holdingsData.length === 0) {
      return NextResponse.json({ portfolioValue: 0, annualDividends: 0 });
    }

    const holdings = holdingsData.map((h) => ({
      symbol: h.symbol,
      shares: Number(h.shares),
      avg_cost: Number(h.avg_cost),
    }));

    const uniqueSymbols = Array.from(new Set(holdings.map((h) => h.symbol)));
    const quotesMap = new Map();
    const metricsMap = new Map();

    const quoteResults = await Promise.allSettled(
      uniqueSymbols.map((sym) => getQuote(sym))
    );
    const metricsResults = await Promise.allSettled(
      uniqueSymbols.map((sym) => getKeyMetrics(sym))
    );

    uniqueSymbols.forEach((sym, idx) => {
      const qRes = quoteResults[idx];
      if (qRes.status === "fulfilled") {
        quotesMap.set(sym, qRes.value);
      }
      const mRes = metricsResults[idx];
      if (mRes.status === "fulfilled") {
        metricsMap.set(sym, mRes.value);
      }
    });

    let portfolioValue = 0;
    let annualDividends = 0;

    for (const h of holdings) {
      const q = quotesMap.get(h.symbol);
      const price = q ? q.price : h.avg_cost;
      const val = h.shares * price;
      portfolioValue += val;

      const m = metricsMap.get(h.symbol);
      const yieldPct = m?.dividendYield ? m.dividendYield / 100 : 0;
      annualDividends += val * yieldPct;
    }

    return NextResponse.json({
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      annualDividends: Math.round(annualDividends * 100) / 100,
    });
  } catch (err) {
    console.error("portfolio summary API failed:", err);
    return NextResponse.json(
      { error: "Failed to summarize portfolio" },
      { status: 500 }
    );
  }
}
