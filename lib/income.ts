export interface IncomeMetric {
  symbol: string;
  shares: number;
  price: number;
  avgCost: number;
  dividendYield: number;
}

export interface IncomeSummary {
  annualIncome: number;
  totalCostBasis: number;
  totalMarketValue: number;
  portfolioYield: number;
  yieldOnCost: number;
}

export function calculateIncomeSummary(metrics: IncomeMetric[]): IncomeSummary {
  const annualIncome = metrics.reduce(
    (total, h) => total + h.shares * h.price * (h.dividendYield / 100),
    0
  );

  const totalCostBasis = metrics.reduce((total, h) => total + h.shares * h.avgCost, 0);
  const totalMarketValue = metrics.reduce((total, h) => total + h.shares * h.price, 0);

  const portfolioYield = totalMarketValue === 0 ? 0 : (annualIncome / totalMarketValue) * 100;
  const yieldOnCost = totalCostBasis === 0 ? 0 : (annualIncome / totalCostBasis) * 100;

  return {
    annualIncome,
    totalCostBasis,
    totalMarketValue,
    portfolioYield,
    yieldOnCost,
  };
}
