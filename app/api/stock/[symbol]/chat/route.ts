import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getKeyMetrics } from "@/lib/market/finnhub";
import type { CompanyProfile, KeyMetrics } from "@/lib/market/types";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol).trim().toUpperCase();

  const body = await request.json();
  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const [profileResult, metricsResult] = await Promise.allSettled([
      getProfile(symbol),
      getKeyMetrics(symbol),
    ]);

    const profile = (profileResult.status === "fulfilled" ? profileResult.value : {}) as Partial<CompanyProfile>;
    const metrics = (metricsResult.status === "fulfilled" ? metricsResult.value : {}) as Partial<KeyMetrics>;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Mocked chat responses
      const name = profile.name || symbol;
      let reply = `That is a great question. In a live environment with a GEMINI_API_KEY configured, I would analyze the latest disclosures for ${name} to answer your question: "${question}". Please set up the API key in your .env.local file to unlock full capabilities.`;
      
      const lowerQ = question.toLowerCase();
      if (lowerQ.includes("buy") || lowerQ.includes("recommend")) {
        reply = `Analyzing whether to buy ${name} (${symbol}) involves examining its P/E ratio (${metrics.peRatio ?? "N/A"}) and growth trajectory. Generally, value investors look for lower entry points, while growth investors favor its expansion. Currently in demo mode; configure GEMINI_API_KEY for a live expert recommendation.`;
      } else if (lowerQ.includes("risk") || lowerQ.includes("competitor")) {
        reply = `Key risks for ${name} include sector-wide valuation compression, supply chain adjustments, and regulatory actions. Its main competitors present strong alternatives in key markets. Configure GEMINI_API_KEY to see a full live risk comparison.`;
      } else if (lowerQ.includes("dividend") || lowerQ.includes("yield")) {
        reply = `Based on the latest key metrics, ${name} has a dividend yield of ${metrics.dividendYield ? metrics.dividendYield + "%" : "0% (or unavailable)"}. A healthy yield combined with a reasonable payout ratio makes it an attractive income option.`;
      }

      return NextResponse.json({ reply });
    }

    const prompt = `
You are a helpful senior equity analyst. Answer the user's question about the stock ${symbol} based on its profile and financial data.

Company Profile:
${JSON.stringify(profile, null, 2)}

Key Metrics:
${JSON.stringify(metrics, null, 2)}

User Question: "${question}"

Provide a concise, professional answer in 2-3 sentences. Keep it objective and grounded in the data.
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
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned error: ${response.status}`);
    }

    const resJson = await response.json();
    const reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to retrieve a response from Gemini.";

    return NextResponse.json({ reply: reply.trim() });
  } catch (err) {
    console.error("AI chat endpoint failed:", err);
    return NextResponse.json(
      { error: "Failed to generate chat response" },
      { status: 500 }
    );
  }
}
