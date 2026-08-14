export interface DividendHoldingForecast {
  symbol: string;
  shares: number;
  marketValue: number;
  costBasis: number;
  dividendYield: number; // in percent (e.g. 2.5)
  annualIncome: number;
  yieldOnCost: number;
}

export interface MonthlyDividendCashFlow {
  monthIndex: number;
  monthName: string;
  projectedIncome: number;
}

export interface DividendForecastSummary {
  totalAnnualIncome: number;
  monthlyAverage: number;
  portfolioMarketValue: number;
  portfolioCostBasis: number;
  currentYieldPercent: number;
  yieldOnCostPercent: number;
  monthlyCashFlows: MonthlyDividendCashFlow[];
  holdings: DividendHoldingForecast[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function calculateMonthlyDividendForecast(
  holdings: readonly {
    symbol: string;
    shares: number;
    avgCost: number;
    price: number;
    dividendYield: number | null; // e.g. 2.5 for 2.5%
  }[]
): DividendForecastSummary {
  let totalAnnualIncome = 0;
  let portfolioMarketValue = 0;
  let portfolioCostBasis = 0;

  const monthlyTotals = new Array(12).fill(0);
  const holdingForecasts: DividendHoldingForecast[] = [];

  holdings.forEach((h, index) => {
    const marketValue = h.shares * h.price;
    const costBasis = h.shares * h.avgCost;
    const divYield = h.dividendYield ?? 0;

    portfolioMarketValue += marketValue;
    portfolioCostBasis += costBasis;

    const annualIncome = (marketValue * divYield) / 100;
    totalAnnualIncome += annualIncome;

    const yieldOnCost = costBasis > 0 ? (annualIncome / costBasis) * 100 : 0;

    if (annualIncome > 0) {
      // Standard US quarterly payout distribution: stagger across 4 quarters
      const startMonth = index % 3; // 0 (Jan, Apr, Jul, Oct), 1 (Feb, May, Aug, Nov), or 2 (Mar, Jun, Sep, Dec)
      const quarterlyPayment = annualIncome / 4;
      monthlyTotals[startMonth] += quarterlyPayment;
      monthlyTotals[startMonth + 3] += quarterlyPayment;
      monthlyTotals[startMonth + 6] += quarterlyPayment;
      monthlyTotals[startMonth + 9] += quarterlyPayment;
    }

    holdingForecasts.push({
      symbol: h.symbol,
      shares: h.shares,
      marketValue: Number(marketValue.toFixed(2)),
      costBasis: Number(costBasis.toFixed(2)),
      dividendYield: Number(divYield.toFixed(2)),
      annualIncome: Number(annualIncome.toFixed(2)),
      yieldOnCost: Number(yieldOnCost.toFixed(2)),
    });
  });

  holdingForecasts.sort((a, b) => b.annualIncome - a.annualIncome);

  const monthlyCashFlows: MonthlyDividendCashFlow[] = MONTH_NAMES.map((name, i) => ({
    monthIndex: i,
    monthName: name,
    projectedIncome: Number(monthlyTotals[i].toFixed(2)),
  }));

  const currentYieldPercent =
    portfolioMarketValue > 0 ? (totalAnnualIncome / portfolioMarketValue) * 100 : 0;
  const yieldOnCostPercent =
    portfolioCostBasis > 0 ? (totalAnnualIncome / portfolioCostBasis) * 100 : 0;

  return {
    totalAnnualIncome: Number(totalAnnualIncome.toFixed(2)),
    monthlyAverage: Number((totalAnnualIncome / 12).toFixed(2)),
    portfolioMarketValue: Number(portfolioMarketValue.toFixed(2)),
    portfolioCostBasis: Number(portfolioCostBasis.toFixed(2)),
    currentYieldPercent: Number(currentYieldPercent.toFixed(2)),
    yieldOnCostPercent: Number(yieldOnCostPercent.toFixed(2)),
    monthlyCashFlows,
    holdings: holdingForecasts,
  };
}
