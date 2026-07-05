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

const MOCK_DIV_GROWTH: Record<string, number> = {
  AAPL: 8.2,
  MSFT: 10.5,
  NVDA: 15.0,
  KO: 4.8,
  WMT: 3.6,
  JPM: 7.5,
  XOM: 3.2,
};

export function getDividendGrowth(symbol: string): number {
  return MOCK_DIV_GROWTH[symbol.toUpperCase().trim()] ?? 4.5;
}

export function calculateChowderScore(dividendYield: number, growthRate: number): number {
  return Math.round((dividendYield + growthRate) * 100) / 100;
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
