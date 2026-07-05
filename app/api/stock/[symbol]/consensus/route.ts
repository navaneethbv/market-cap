import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getKeyMetrics } from "@/lib/market/finnhub";
import type { CompanyProfile, KeyMetrics } from "@/lib/market/types";
import { createClient } from "@/lib/supabase/server";

interface ConsensusResult {
  consensusScore: number;
  label: string;
  rationale: string;
  upsideDrivers: string[];
  downsideRisks: string[];
  isMock: boolean;
}

function generateMockConsensus(
  symbol: string,
  profile: Partial<CompanyProfile>,
  metrics: Partial<KeyMetrics>
): ConsensusResult {
  const name = profile.name || symbol;
  const pe = metrics.peRatio ? Number(metrics.peRatio) : 20.0;

  let score = 50;
  let label = "Fair Value";
  let rationale = `The market valuation of ${name} is fairly balanced between earnings growth expectations and sector premium coefficients. Multiples appear aligned with historical trading bands.`;
  
  const upsideDrivers = [
    "Resilient operational model with strong competitive advantages.",
    "Potential expansion of capital reallocation programs (dividends & buybacks).",
    "Operating leverage improvement from digitalization integrations.",
  ];
  const downsideRisks = [
    "Macroeconomic fluctuations impacting customer discretionary spends.",
    "Multiple expansion is limited by higher interest rate environments.",
    "Regulatory audits and legal standard compliances.",
  ];

  if (symbol === "AAPL") {
    score = 65;
    label = "Premium";
    rationale = "Apple Inc. commands a growth premium driven by high ecosystem retention, services growth, and premium hardware pricing power. Low risk metrics justify multiples.";
  } else if (symbol === "KO") {
    score = 35;
    label = "Value";
    rationale = "Coca-Cola is priced in the value quadrant, presenting limited downside risk, reliable cash flows, and excellent defensive dividend cover metrics.";
  } else if (pe > 35) {
    score = 85;
    label = "Speculative";
    rationale = "Elevated price-to-earnings ratios imply significant forward growth expectations. While operational momentum is high, any miss in growth rate could trigger sharp valuation corrections.";
  } else if (pe < 15) {
    score = 15;
    label = "Deep Value";
    rationale = "Subdued multiples suggest negative sentiment or cyclical bottoms. Risk-reward is highly skewed to the upside, though immediate growth catalysts appear muted.";
  }

  return {
    consensusScore: score,
    label,
    rationale,
    upsideDrivers,
    downsideRisks,
    isMock: true,
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
    const cacheKey = `${symbol}_consensus`;
    const { data: cached, error: cacheError } = await supabase
      .from("stock_ai_summaries")
      .select("analysis, updated_at")
      .eq("symbol", cacheKey)
      .maybeSingle();

    if (!cacheError && cached) {
      const updatedAt = new Date(cached.updated_at).getTime();
      const now = new Date().getTime();
      const ageHours = (now - updatedAt) / (1000 * 60 * 60);

      if (ageHours < 24) {
        return NextResponse.json(cached.analysis);
      }
    }

    const [profileResult, metricsResult] = await Promise.allSettled([
      getProfile(symbol),
      getKeyMetrics(symbol),
    ]);

    const profile = profileResult.status === "fulfilled" ? profileResult.value : {};
    const metrics = metricsResult.status === "fulfilled" ? metricsResult.value : {};

    const apiKey = process.env.GEMINI_API_KEY;
    let consensus: ConsensusResult;

    if (!apiKey) {
      consensus = generateMockConsensus(symbol, profile, metrics);
    } else {
      const prompt = `
You are a senior equity research director. Analyze the valuation metrics for ${symbol} and calculate a Consolidated Valuation Consensus Score from 0 to 100 (where 0-20 represents Deep Value, 20-40 represents Value, 40-60 represents Fair Value, 60-80 represents Premium, and 80-100 represents Speculative/Overvalued).

Company Profile:
${JSON.stringify(profile, null, 2)}

Key Valuation Metrics:
${JSON.stringify(metrics, null, 2)}

Provide a rating label matching the score, a 2-sentence rationale, exactly 3 upside drivers, and exactly 3 downside valuation risks.

Return your response in strict JSON format matching this schema:
{
  "consensusScore": number,
  "label": "string",
  "rationale": "string",
  "upsideDrivers": ["string", "string", "string"],
  "downsideRisks": ["string", "string", "string"]
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
              parts: [{ text: prompt }],
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

      consensus = JSON.parse(text.trim());
      consensus.isMock = false;
    }

    await supabase.from("stock_ai_summaries").upsert({
      symbol: cacheKey,
      analysis: consensus,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(consensus);
  } catch (err) {
    console.error("AI consensus endpoint failed:", err);
    return NextResponse.json(
      { error: "Failed to generate stock valuation consensus" },
      { status: 500 }
    );
  }
}
