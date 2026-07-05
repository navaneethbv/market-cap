export interface RiskAsset {
  symbol: string;
  value: number;
  beta: number;
}

export function calculateWeightedBeta(assets: RiskAsset[]): number {
  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  if (totalValue === 0) return 1.0;

  const weightedSum = assets.reduce((sum, a) => sum + a.value * a.beta, 0);
  return weightedSum / totalValue;
}

export function calculateHHI(assets: RiskAsset[]): number {
  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  if (totalValue === 0) return 0;

  let hhi = 0;
  assets.forEach((a) => {
    const weightPercent = (a.value / totalValue) * 100;
    hhi += weightPercent * weightPercent;
  });

  return hhi;
}

export function getHHILabel(hhi: number): { label: string; tone: string; description: string } {
  if (hhi === 0) {
    return {
      label: "Empty",
      tone: "text-muted-foreground",
      description: "No assets owned.",
    };
  }
  if (hhi < 1500) {
    return {
      label: "Highly Diversified",
      tone: "text-emerald-600 dark:text-emerald-400",
      description: "Asset concentration risk is extremely low.",
    };
  }
  if (hhi <= 2500) {
    return {
      label: "Moderately Concentrated",
      tone: "text-amber-500 dark:text-amber-500",
      description: "Normal concentration. A few large positions anchor your portfolio.",
    };
  }
  return {
    label: "Highly Concentrated",
    tone: "text-red-600 dark:text-red-400",
    description: "High asset risk. Your returns are highly dependent on a few stocks.",
  };
}
