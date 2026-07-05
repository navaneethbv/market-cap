import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getKeyMetrics, getCompanyNews } from "@/lib/market/finnhub";
import type { CompanyProfile, KeyMetrics } from "@/lib/market/types";
import { createClient } from "@/lib/supabase/server";

interface AnalysisResult {
  consensus: "Bullish" | "Bearish" | "Neutral";
  summary: string;
  bullCase: string[];
  bearCase: string[];
  isMock: boolean;
}

function generateMockAnalysis(
  symbol: string,
  profile: Partial<CompanyProfile>,
  metrics: Partial<KeyMetrics>
): AnalysisResult {
  const name = profile.name || symbol;
  const pe = metrics.peRatio ? Number(metrics.peRatio) : null;

  let consensus: "Bullish" | "Bearish" | "Neutral" = "Neutral";
  let summary = `${name} (${symbol}) continues to demonstrate solid market presence in the ${profile.industry || "technology"} sector. Recent earnings and market activity indicate stable customer demand, though macroeconomic headwinds could pose near-term valuation challenges.`;
  let bullCase = [
    "Strong balance sheet with healthy cash flows supporting capital return programs.",
    "Dominant market position and high brand loyalty in its core segment.",
    "Expansion into high-growth software services and recurring revenue streams."
  ];
  let bearCase = [
    "High valuation multiples relative to historical averages limit near-term upside.",
    "Regulatory scrutiny and antitrust investigations in multiple jurisdictions.",
    "Exposure to global supply chain disruptions and shifting consumer spending habits."
  ];

  if (symbol === "AAPL") {
    consensus = "Bullish";
    summary = "Apple Inc. shows strong momentum driven by robust services revenue growth and expectations around device refresh cycles. The company's massive ecosystem lock-in and premium brand power continue to defend its high margins.";
    bullCase = [
      "Ecosystem lock-in with over 2 billion active devices creates high switching costs.",
      "High-margin Services division continues to grow faster than hardware segments.",
      "Strong cash flow generation supports massive stock buybacks and dividend growth."
    ];
    bearCase = [
      "Hardware revenue is highly dependent on consumer discretionary spending cycles.",
      "Antitrust actions from EU and US regulators threaten App Store commission models.",
      "Intensifying competition in key international smartphone markets like China."
    ];
  } else if (symbol === "MSFT") {
    consensus = "Bullish";
    summary = "Microsoft remains a premier enterprise software and cloud computing vendor. Its early leadership in commercial artificial intelligence integrations across Azure and Office 365 positions it to capture substantial enterprise spend.";
    bullCase = [
      "Azure Cloud services continue to grow rapidly, taking market share from competitors.",
      "Early monetization of generative AI features via GitHub Copilot and Office Copilots.",
      "Highly diversified portfolio of enterprise SaaS, gaming, and operating systems."
    ];
    bearCase = [
      "Massive capital expenditure on AI data centers could pressure short-term margins.",
      "Slowing growth in personal computing and PC licensing divisions.",
      "Integration risks and regulatory concessions from large acquisitions like Activision."
    ];
  } else if (pe && pe > 35) {
    consensus = "Bullish";
    summary = `${name} is currently valued as a premium growth stock. High forward multiples are supported by strong market demand, although this leaves the stock vulnerable to any minor earnings misses.`;
    bullCase = [
      "Revenue growth is accelerating faster than industry peers.",
      "Leadership in next-generation technology developments and innovation.",
      "Expanding operating margins through operating leverage."
    ];
  } else if (pe && pe < 15) {
    consensus = "Neutral";
    summary = `${name} is trading at a depressed price-to-earnings multiple, indicating it is valued as a mature or turnaround play. While downside appears limited, catalysts for near-term growth are weak.`;
    bearCase = [
      "Slower growth prospects in mature core product lines.",
      "Pressure from nimbler, pure-play digital competitors.",
      "Cyclical industry exposure could depress earnings in a downturn."
    ];
  }

  return {
    consensus,
    summary,
    bullCase,
    bearCase,
    isMock: true
  };
}

export async function GET(
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

  if (!symbol || !/^[A-Z0-9.^-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const { data: cached, error: cacheError } = await supabase
      .from("stock_ai_summaries")
      .select("analysis, updated_at")
      .eq("symbol", symbol)
      .maybeSingle();

    if (!cacheError && cached) {
      const updatedAt = new Date(cached.updated_at).getTime();
      const now = new Date().getTime();
      const ageHours = (now - updatedAt) / (1000 * 60 * 60);

      if (ageHours < 24) {
        return NextResponse.json(cached.analysis);
      }
    }

    const [profileResult, metricsResult, newsResult] = await Promise.allSettled([
      getProfile(symbol),
      getKeyMetrics(symbol),
      getCompanyNews(symbol),
    ]);

    const profile = profileResult.status === "fulfilled" ? profileResult.value : {};
    const metrics = metricsResult.status === "fulfilled" ? metricsResult.value : {};
    const news = newsResult.status === "fulfilled" ? newsResult.value : [];

    const apiKey = process.env.GEMINI_API_KEY;
    let analysis: AnalysisResult;

    if (!apiKey) {
      analysis = generateMockAnalysis(symbol, profile, metrics);
    } else {
      const prompt = `
You are a senior equity analyst. Analyze the following stock data for ${symbol} and provide a consensus rating ("Bullish", "Bearish", or "Neutral"), a brief 2-3 sentence overview, exactly 3 bullet points for the Bull Case (reasons to buy/positive drivers), and exactly 3 bullet points for the Bear Case (reasons to sell/risks).

Company Profile:
${JSON.stringify(profile, null, 2)}

Key Metrics:
${JSON.stringify(metrics, null, 2)}

Recent News:
${JSON.stringify(news.slice(0, 5).map(n => ({ title: n.headline, summary: n.summary })), null, 2)}

Return your response in strict JSON format matching this schema:
{
  "consensus": "Bullish" | "Bearish" | "Neutral",
  "summary": "string",
  "bullCase": ["string", "string", "string"],
  "bearCase": ["string", "string", "string"]
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
        throw new Error(`Gemini API returned error: ${response.status}`);
      }

      const resJson = await response.json();
      let text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (text.startsWith("```json")) {
        text = text.substring(7);
      }
      if (text.endsWith("```")) {
        text = text.substring(0, text.length - 3);
      }

      analysis = JSON.parse(text.trim());
      analysis.isMock = false;
    }

    const { error: upsertError } = await supabase
      .from("stock_ai_summaries")
      .upsert({
        symbol,
        analysis,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Failed to cache AI analysis:", upsertError.message);
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("AI analyst endpoint failed:", err);
    return NextResponse.json(
      { error: "Failed to generate stock AI analysis" },
      { status: 500 }
    );
  }
}
