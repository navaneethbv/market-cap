export interface RebalanceInputHolding {
  symbol: string;
  shares: number;
  price: number;
}

export interface RebalanceRow {
  symbol: string;
  currentShares: number;
  currentPrice: number;
  currentValue: number;
  currentWeightPercent: number;
  targetWeightPercent: number;
  targetValue: number;
  targetShares: number;
  deltaShares: number;
  deltaValue: number;
  action: "BUY" | "SELL" | "HOLD";
}

export interface RebalancePlan {
  error: string | null;
  rows: RebalanceRow[];
  totalCurrentValue: number;
  totalTargetValue: number;
  totalTargetWeight: number;
  extraCash: number;
  isBalanced: boolean;
}

export function calculateRebalancePlan(
  holdings: readonly RebalanceInputHolding[],
  targetWeights: Record<string, number>,
  extraCash = 0
): RebalancePlan {
  const safeExtraCash = Number.isFinite(extraCash) ? Math.max(0, extraCash) : 0;
  const totalCurrentValue = holdings.reduce(
    (sum, h) => sum + h.shares * h.price,
    0
  );
  const totalTargetValue = totalCurrentValue + safeExtraCash;

  const totalTargetWeight = holdings.map((holding) => targetWeights[holding.symbol] ?? 0).reduce(
    (sum, w) => sum + (Number.isFinite(w) ? w : 0),
    0
  );

  let error: string | null = null;
  if (!Number.isFinite(extraCash) || extraCash < 0) {
    error = "Enter a finite, nonnegative cash contribution.";
  } else if (holdings.some((holding) => !Number.isFinite(holding.price) || holding.price <= 0 || !Number.isFinite(holding.shares) || holding.shares < 0) || !Number.isFinite(totalTargetValue)) {
    error = "Valid share counts and current prices are required for every holding.";
  } else if (holdings.some((holding) => {
    const weight = targetWeights[holding.symbol] ?? 0;
    return !Number.isFinite(weight) || weight < 0 || weight > 100;
  }) || Math.abs(totalTargetWeight - 100) > 0.000001) {
    error = "Target weights must total 100% before a trade plan can be calculated.";
  }
  if (error) {
    return { error, rows: [], totalCurrentValue, totalTargetValue, totalTargetWeight, extraCash: safeExtraCash, isBalanced: false };
  }

  const rows: RebalanceRow[] = holdings.map((h) => {
    const currentValue = h.shares * h.price;
    const currentWeightPercent =
      totalCurrentValue > 0 ? (currentValue / totalCurrentValue) * 100 : 0;
    const targetWeightPercent = targetWeights[h.symbol] ?? 0;
    const targetValue = totalTargetValue * (targetWeightPercent / 100);
    const targetShares = h.price > 0 ? targetValue / h.price : 0;
    const deltaShares = targetShares - h.shares;
    const deltaValue = targetValue - currentValue;

    let action: "BUY" | "SELL" | "HOLD" = "HOLD";
    if (deltaShares > 0.01 && deltaValue > 1) {
      action = "BUY";
    } else if (deltaShares < -0.01 && deltaValue < -1) {
      action = "SELL";
    }

    return {
      symbol: h.symbol,
      currentShares: h.shares,
      currentPrice: h.price,
      currentValue,
      currentWeightPercent,
      targetWeightPercent,
      targetValue,
      targetShares,
      deltaShares,
      deltaValue,
      action,
    };
  });

  const isBalanced = rows.every((r) => r.action === "HOLD");

  return {
    error: null,
    rows,
    totalCurrentValue,
    totalTargetValue,
    totalTargetWeight,
    extraCash: safeExtraCash,
    isBalanced,
  };
}

export function getEqualWeights(
  symbols: readonly string[]
): Record<string, number> {
  if (symbols.length === 0) return {};
  const weight = Number((100 / symbols.length).toFixed(2));
  const result: Record<string, number> = {};
  let sum = 0;
  for (let i = 0; i < symbols.length - 1; i++) {
    result[symbols[i]] = weight;
    sum += weight;
  }
  const lastSymbol = symbols.at(-1)!;
  result[lastSymbol] = Number((100 - sum).toFixed(2));
  return result;
}
