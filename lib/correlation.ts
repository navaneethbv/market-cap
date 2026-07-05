export function calculateCorrelation(pricesA: number[], pricesB: number[]): number {
  if (pricesA.length === 0 || pricesB.length === 0) return 0;
  
  const minLength = Math.min(pricesA.length, pricesB.length);
  if (minLength < 2) return 0;

  const n = minLength;
  const a = pricesA.slice(0, n);
  const b = pricesB.slice(0, n);

  const meanA = a.reduce((sum, val) => sum + val, 0) / n;
  const meanB = b.reduce((sum, val) => sum + val, 0) / n;

  let num = 0;
  let denA = 0;
  let denB = 0;

  for (let i = 0; i < n; i++) {
    const diffA = a[i] - meanA;
    const diffB = b[i] - meanB;
    num += diffA * diffB;
    denA += diffA * diffA;
    denB += diffB * diffB;
  }

  if (denA === 0 || denB === 0) return 0;
  return num / Math.sqrt(denA * denB);
}

const BASE_MOCK_SERIES: Record<string, number[]> = {
  AAPL: [180.2, 181.5, 179.8, 180.5, 182.1, 183.0, 182.5, 184.1, 185.0, 186.2],
  MSFT: [415.0, 418.2, 414.5, 416.0, 419.5, 421.0, 420.5, 423.2, 425.0, 427.5],
  AMZN: [180.5, 182.0, 179.9, 181.0, 183.2, 184.5, 183.8, 185.5, 187.0, 188.5],
  TSLA: [210.0, 218.0, 212.5, 215.0, 222.0, 225.0, 221.0, 228.0, 230.5, 235.0],
  KO: [60.5, 60.8, 61.0, 60.7, 60.9, 61.1, 61.2, 61.0, 61.3, 61.4],
  WMT: [67.2, 67.5, 67.8, 67.4, 67.6, 67.9, 68.0, 67.8, 68.2, 68.3],
};

export function getMockHistoricalPrices(symbol: string): number[] {
  const clean = symbol.toUpperCase().trim();
  if (clean in BASE_MOCK_SERIES) {
    return BASE_MOCK_SERIES[clean];
  }
  // Generate a random stable walk if symbol not in list
  const seed = clean.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = (seed % 150) + 50;
  const walk = [base];
  for (let i = 1; i < 10; i++) {
    const change = ((seed + i) % 5) - 2; // -2 to +2
    walk.push(walk[i - 1] + change);
  }
  return walk;
}

export function getCorrelationLabel(r: number): {
  label: string;
  description: string;
} {
  if (r >= 0.7) {
    return {
      label: "Strong Positive",
      description: "These assets move in lockstep. Adding both offers limited diversification.",
    };
  }
  if (r >= 0.3) {
    return {
      label: "Moderate Positive",
      description: "These assets have some common movement but offer partial diversification.",
    };
  }
  if (r >= -0.3) {
    return {
      label: "Uncorrelated / Diversified",
      description: "These assets move independently. Combining them provides excellent diversification.",
    };
  }
  if (r >= -0.7) {
    return {
      label: "Moderate Negative",
      description: "These assets move in opposite directions, providing strong hedging traits.",
    };
  }
  return {
    label: "Strong Negative",
    description: "These assets are highly negatively correlated, acting as pure hedges for each other.",
  };
}
