export interface SnowballParams {
  initialPortfolioValue: number;
  initialAnnualDividends: number;
  monthlyContribution: number;
  reinvestDividends: boolean;
  dividendGrowthRate: number; // e.g. 0.05 for 5%
  expectedPriceAppreciation: number; // e.g. 0.06 for 6%
  timeHorizonYears: number; // e.g. 20
}

export interface SnowballYearPoint {
  year: number;
  portfolioValue: number;
  costBasis: number;
  annualDividends: number;
  cumulativeDividends: number;
}

export interface SnowballResult {
  points: SnowballYearPoint[];
  crossoverYear: number | null;
  finalYieldOnCost: number;
  totalDividendsReceived: number;
}

export function runSnowballProjection(params: SnowballParams): SnowballResult {
  const {
    initialPortfolioValue,
    initialAnnualDividends,
    monthlyContribution,
    reinvestDividends,
    dividendGrowthRate,
    expectedPriceAppreciation = 0.06,
    timeHorizonYears = 20,
  } = params;

  const points: SnowballYearPoint[] = [];
  let portfolioValue = initialPortfolioValue;
  let costBasis = initialPortfolioValue;
  let annualDividends = initialAnnualDividends;
  let cumulativeDividends = 0;

  // Average yield starts as initial dividends / initial value
  let averageYield = initialPortfolioValue > 0 ? initialAnnualDividends / initialPortfolioValue : 0;

  let crossoverYear: number | null = null;
  const annualContributions = monthlyContribution * 12;

  // Year 0 point
  points.push({
    year: 0,
    portfolioValue,
    costBasis,
    annualDividends,
    cumulativeDividends: 0,
  });

  const monthlyAppreciationRate = expectedPriceAppreciation / 12;

  for (let year = 1; year <= timeHorizonYears; year++) {
    for (let month = 1; month <= 12; month++) {
      // Monthly dividend payment is based on current annual rate / 12
      // In a real portfolio, dividend yields are tied to the share counts, which appreciate
      const monthlyDividends = (portfolioValue * averageYield) / 12;
      cumulativeDividends += monthlyDividends;

      // Price appreciation on the current portfolio value
      portfolioValue = portfolioValue * (1 + monthlyAppreciationRate);

      // Add monthly contributions to portfolio value and cost basis
      portfolioValue += monthlyContribution;
      costBasis += monthlyContribution;

      // Reinvest dividends if enabled
      if (reinvestDividends) {
        portfolioValue += monthlyDividends;
        // Dividend reinvestments do not count towards the user's out of pocket cost basis
      }
    }

    // Apply annual dividend growth rate to the yield
    averageYield = averageYield * (1 + dividendGrowthRate);

    // Compute annual dividends for the next year based on the new yield and portfolio value
    annualDividends = portfolioValue * averageYield;

    // Check for contribution crossover
    if (crossoverYear === null && annualDividends > annualContributions && annualContributions > 0) {
      crossoverYear = year;
    }

    points.push({
      year,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      costBasis: Math.round(costBasis * 100) / 100,
      annualDividends: Math.round(annualDividends * 100) / 100,
      cumulativeDividends: Math.round(cumulativeDividends * 100) / 100,
    });
  }

  const finalYieldOnCost = costBasis > 0 ? (annualDividends / costBasis) * 100 : 0;

  return {
    points,
    crossoverYear,
    finalYieldOnCost: Math.round(finalYieldOnCost * 100) / 100,
    totalDividendsReceived: Math.round(cumulativeDividends * 100) / 100,
  };
}
