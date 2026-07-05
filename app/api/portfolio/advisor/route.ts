import { NextResponse, type NextRequest } from "next/server";
import { getQuote, getKeyMetrics, getProfile } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";

interface AdvisorResult {
  rating: string;
  weightedBeta: number;
  summary: string;
  sectorExposure: { sector: string; weight: number }[];
  recommendations: { action: string; symbol: string; reason: string }[];
}

interface AdvisorHolding {
  symbol: string;
  value: number;
  sector: string;
}

function generateMockAdvisor(goal: string, holdings: AdvisorHolding[], cash: number): AdvisorResult {
  const totalStocksVal = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalVal = totalStocksVal + cash;

  const techWeight = totalVal === 0 ? 0 : Math.round((holdings.filter(h => h.sector === "Technology").reduce((sum, h) => sum + h.value, 0) / totalVal) * 100);
  const consumerWeight = totalVal === 0 ? 0 : Math.round((holdings.filter(h => h.sector === "Consumer Cyclical" || h.sector === "Consumer Defensive").reduce((sum, h) => sum + h.value, 0) / totalVal) * 100);
  const financialsWeight = totalVal === 0 ? 0 : Math.round((holdings.filter(h => h.sector === "Financials").reduce((sum, h) => sum + h.value, 0) / totalVal) * 100);
  const otherWeight = Math.max(0, 100 - techWeight - consumerWeight - financialsWeight);

  const sectorExposure = [
    { sector: "Technology", weight: techWeight },
    { sector: "Consumer Products", weight: consumerWeight },
    { sector: "Financials", weight: financialsWeight },
    { sector: "Others & Cash", weight: otherWeight }
  ].filter(s => s.weight > 0);

  let rating = "B";
  let summary = `Your portfolio shows a strong foundational setup with a market value of $${totalStocksVal.toLocaleString()}. However, your asset allocation could be optimized to match your stated "${goal}" target goal.`;
  let recommendations = [
    {
      action: "Divert Tech Concentration",
      symbol: holdings[0]?.symbol || "AAPL",
      reason: "Slightly trim high-multiple tech positions to lock in capital gains and reduce downside variance."
    },
    {
      action: "Add Defensive Anchor",
      symbol: "KO",
      reason: "Use remaining cash or sale proceeds to establish a position in consumer defensive stock to capture reliable dividends."
    }
  ];

  if (goal === "Income") {
    rating = "B-";
    summary = `Your portfolio has a yield profile that is slightly conservative. Rebalancing into high-dividend equities will improve your estimated annual payouts to align with an Income goal.`;
    recommendations = [
      {
        action: "Increase High-Yield Exposure",
        symbol: "ABBV",
        reason: "Pharmaceutical blue-chip with strong dividend growth track record to raise portfolio payout yield."
      },
      {
        action: "Accumulate Utility Value",
        symbol: "KO",
        reason: "Adds defensive stable dividends and lowers overall portfolio beta."
      }
    ];
  } else if (goal === "High Growth") {
    rating = "A-";
    summary = `Your portfolio is well-positioned for equity appreciation, featuring strong momentum growth drivers in tech and cyclical consumer goods.`;
    recommendations = [
      {
        action: "Increase Semiconductor Share",
        symbol: "NVDA",
        reason: "Maintains exposure to computing infrastructure growth to target high capital appreciation."
      }
    ];
  }

  return {
    rating,
    weightedBeta: 1.18,
    summary,
    sectorExposure,
    recommendations,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const goal = String(body.goal ?? "Balanced");
    const portfolioType = String(body.portfolioType ?? "real");

    // 1. Fetch user holdings based on type
    const holdingsTable = portfolioType === "paper" ? "paper_holdings" : "holdings";
    const { data: holdingsData, error: hError } = await supabase
      .from(holdingsTable)
      .select("symbol,shares,avg_cost")
      .eq("user_id", user.id);

    if (hError) {
      throw new Error(hError.message);
    }

    // 2. Fetch cash balance
    let cashBalance = 0;
    if (portfolioType === "paper") {
      const { data: pData } = await supabase
        .from("paper_portfolios")
        .select("cash_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      cashBalance = pData ? Number(pData.cash_balance) : 100000.00;
    }

    const rawHoldings = holdingsData ?? [];
    
    // Resolve quotes and profiles for holdings in parallel
    const symbols = rawHoldings.map(h => h.symbol);
    const uniqueSymbols = Array.from(new Set(symbols));

    const quotesMap = new Map();
    const profilesMap = new Map();
    const metricsMap = new Map();

    const fetchResults = await Promise.allSettled(
      uniqueSymbols.map(async (sym) => {
        const [q, p, m] = await Promise.all([
          getQuote(sym).catch(() => null),
          getProfile(sym).catch(() => null),
          getKeyMetrics(sym).catch(() => null),
        ]);
        return { symbol: sym, quote: q, profile: p, metrics: m };
      })
    );

    fetchResults.forEach((res) => {
      if (res.status === "fulfilled" && res.value) {
        const val = res.value;
        quotesMap.set(val.symbol, val.quote);
        profilesMap.set(val.symbol, val.profile);
        metricsMap.set(val.symbol, val.metrics);
      }
    });

    const holdings = rawHoldings.map((h) => {
      const quote = quotesMap.get(h.symbol);
      const profile = profilesMap.get(h.symbol);
      const metrics = metricsMap.get(h.symbol);

      const shares = Number(h.shares);
      const price = quote ? quote.price : Number(h.avg_cost);
      const value = shares * price;

      return {
        symbol: h.symbol,
        shares,
        avgCost: Number(h.avg_cost),
        price,
        value,
        sector: profile?.industry || "Others",
        beta: metrics?.beta || 1.0,
        dividendYield: metrics?.dividendYield || 0,
      };
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const result = generateMockAdvisor(goal, holdings, cashBalance);
      return NextResponse.json({ result, holdings });
    }

    const prompt = `
You are an expert financial advisor and portfolio manager. Analyze the following user portfolio and provide rebalancing recommendations based on the target investment goal: "${goal}".

Portfolio Details:
Cash Balance: $${cashBalance}
Holdings:
${JSON.stringify(holdings, null, 2)}

Target Goal: ${goal}

Please analyze:
1. Sector Exposure: Warn if a single sector has >40% exposure.
2. Weighted average Beta of the portfolio.
3. Suggest 2-3 specific rebalancing actions (e.g. "Sell 5% AAPL, buy 5% JNJ").
4. Provide a brief 2-3 sentence overview of the current health of the portfolio.

Return your response in strict JSON format matching this schema:
{
  "rating": "A" | "B" | "C" | "D" | "F",
  "weightedBeta": number,
  "summary": "string",
  "sectorExposure": [
    { "sector": "string", "weight": number }
  ],
  "recommendations": [
    { "action": "string", "symbol": "string", "reason": "string" }
  ]
}
Do not include any markdown formatting (like \`\`\`json) or extra text outside the JSON object.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(text) as AdvisorResult;

    return NextResponse.json({ result, holdings });
  } catch (err) {
    console.error("Advisor POST failed:", err);
    // Graceful fallback on API error
    const goal = "Balanced";
    const result = generateMockAdvisor(goal, [], 100000.00);
    return NextResponse.json({ result, holdings: [] });
  }
}
