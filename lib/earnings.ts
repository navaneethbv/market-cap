export interface EarningsSurprise {
  actual: number | null;
  estimate: number | null;
  period: string;
  quarter?: number;
  surprise: number | null;
  surprisePercent: number | null;
  symbol: string;
  year?: number;
}

export type EarningsSurpriseResult = "beat" | "miss" | "meet" | "unreported";

export interface EarningsStats {
  totalQuarters: number;
  beatCount: number;
  missCount: number;
  meetCount: number;
  beatRatePercent: number;
  averageSurprisePercent: number | null;
}

export function classifyEarningsSurprise(
  actual: number | null,
  estimate: number | null
): EarningsSurpriseResult {
  if (actual === null || estimate === null) {
    return "unreported";
  }
  const delta = actual - estimate;
  if (Math.abs(delta) < 0.0001) {
    return "meet";
  }
  return delta > 0 ? "beat" : "miss";
}

export function calculateEarningsStats(
  surprises: readonly EarningsSurprise[]
): EarningsStats {
  if (surprises.length === 0) {
    return {
      totalQuarters: 0,
      beatCount: 0,
      missCount: 0,
      meetCount: 0,
      beatRatePercent: 0,
      averageSurprisePercent: null,
    };
  }

  let beatCount = 0;
  let missCount = 0;
  let meetCount = 0;
  let surpriseSum = 0;
  let surpriseCount = 0;

  for (const s of surprises) {
    const classification = classifyEarningsSurprise(s.actual, s.estimate);
    if (classification === "beat") beatCount++;
    else if (classification === "miss") missCount++;
    else if (classification === "meet") meetCount++;

    if (s.surprisePercent !== null && Number.isFinite(s.surprisePercent)) {
      surpriseSum += s.surprisePercent;
      surpriseCount++;
    }
  }

  const reportedQuarters = beatCount + missCount + meetCount;
  const beatRatePercent =
    reportedQuarters > 0 ? (beatCount / reportedQuarters) * 100 : 0;

  return {
    totalQuarters: surprises.length,
    beatCount,
    missCount,
    meetCount,
    beatRatePercent: Number(beatRatePercent.toFixed(1)),
    averageSurprisePercent:
      surpriseCount > 0
        ? Number((surpriseSum / surpriseCount).toFixed(2))
        : null,
  };
}
