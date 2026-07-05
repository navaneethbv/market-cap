export interface RiskAsset {
  symbol: string;
  value: number;
  beta: number;
  sector: string;
}

export interface StressScenarioResult {
  name: string;
  description: string;
  lossPercent: number;
  lossAmount: number;
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

export function simulateStressScenarios(assets: RiskAsset[]): StressScenarioResult[] {
  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);
  if (totalValue === 0) return [];

  // Scenarios define multipliers of LOSS (positive is loss, e.g. 0.42 = 42% loss)
  const scenarios = [
    {
      name: "2008 Financial Crisis",
      description: "Severe credit freeze. Financials and growth assets collapse, defensive holds relatively well.",
      multipliers: {
        Technology: 0.45,
        "Communication Services": 0.42,
        Financials: 0.58,
        Healthcare: 0.18,
        "Consumer Defensive": 0.12,
        "Consumer Cyclical": 0.40,
        Energy: 0.35,
        Industrials: 0.38,
      } as Record<string, number>,
    },
    {
      name: "2020 Pandemic Crash",
      description: "Fast liquidity squeeze. High variance, travel and cyclicals fall hard while tech rebounds quickly.",
      multipliers: {
        Technology: 0.15,
        "Communication Services": 0.18,
        Financials: 0.28,
        Healthcare: 0.10,
        "Consumer Defensive": 0.08,
        "Consumer Cyclical": 0.35,
        Energy: 0.30,
        Industrials: 0.26,
      } as Record<string, number>,
    },
    {
      name: "2000 Dot-com Bubble",
      description: "Growth asset collapse. Severe tech valuation reset, while value and defensive shares advance.",
      multipliers: {
        Technology: 0.78,
        "Communication Services": 0.72,
        Financials: 0.18,
        Healthcare: -0.08, // Negative loss is a GAIN
        "Consumer Defensive": -0.12,
        "Consumer Cyclical": 0.32,
        Energy: 0.15,
        Industrials: 0.20,
      } as Record<string, number>,
    },
  ];

  return scenarios.map((scenario) => {
    let lossAmount = 0;

    assets.forEach((a) => {
      // Find matching sector modifier or use general default of 30% loss
      const modifier = scenario.multipliers[a.sector] ?? 0.30;
      lossAmount += a.value * modifier;
    });

    return {
      name: scenario.name,
      description: scenario.description,
      lossPercent: (lossAmount / totalValue) * 100,
      lossAmount,
    };
  });
}
