export interface MonteCarloInput {
  initialCapital: number;
  monthlyContribution: number;
  annualReturn: number; // e.g. 0.08 for 8%
  annualVolatility: number; // e.g. 0.15 for 15%
  timeHorizonYears: number;
  simulationCount?: number; // default 250
  targetValue: number;
  seed?: number;
}

export interface MonteCarloYearPoint {
  year: number;
  percentile10: number;
  percentile50: number;
  percentile90: number;
  costBasis: number;
}

export interface MonteCarloResult {
  points: MonteCarloYearPoint[];
  probabilityOfSuccess: number;
}

/**
 * Standard Box-Muller transform to generate standard normal random numbers
 * with mean = 0 and standard deviation = 1.
 */
export function randomNormal(): number {
  return randomNormalFrom(Math.random);
}

function createSeededRandom(seed: number): () => number {
  let state = Math.trunc(seed) % 2_147_483_647;
  if (state <= 0) state += 2_147_483_646;
  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
}

function randomNormalFrom(random: () => number): number {
  let u = 0;
  let v = 0;
  // Box-Muller requires inputs strictly in (0, 1)
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Executes a Monte Carlo simulation for portfolio values over time.
 */
export function runMonteCarloSimulation(input: MonteCarloInput): MonteCarloResult {
  const {
    initialCapital,
    monthlyContribution,
    annualReturn,
    annualVolatility,
    timeHorizonYears,
    simulationCount = 250,
    targetValue,
    seed = 1,
  } = input;

  if (!Number.isInteger(timeHorizonYears) || timeHorizonYears < 1) {
    throw new Error("time horizon must be at least 1 year");
  }
  if (!Number.isInteger(simulationCount) || simulationCount < 1) {
    throw new Error("simulation count must be at least 1");
  }

  const totalMonths = timeHorizonYears * 12;
  const monthlyMean = annualReturn / 12;
  const monthlyVol = annualVolatility / Math.sqrt(12);
  const seededRandom = createSeededRandom(seed);

  // Store portfolio values for each simulation path.
  // Each path will contain points for Year 0 up to Year N.
  const paths: number[][] = Array.from({ length: simulationCount }, () => [initialCapital]);

  // Simulate monthly updates
  for (let s = 0; s < simulationCount; s++) {
    let currentVal = initialCapital;

    for (let month = 1; month <= totalMonths; month++) {
      const norm = randomNormalFrom(seededRandom);
      const returnRate = monthlyMean + monthlyVol * norm;

      currentVal = currentVal * (1 + returnRate) + monthlyContribution;
      if (currentVal < 0) {
        currentVal = 0;
      }

      // Record at the end of each year
      if (month % 12 === 0) {
        paths[s].push(currentVal);
      }
    }
  }

  // Calculate percentiles and cost basis for each year
  const points: MonteCarloYearPoint[] = [];

  for (let year = 0; year <= timeHorizonYears; year++) {
    // Extract year values for all simulation paths
    const yearValues = paths.map((path) => path[year]).sort((a, b) => a - b);

    const p10Idx = Math.floor(yearValues.length * 0.10);
    const p50Idx = Math.floor(yearValues.length * 0.50);
    const p90Idx = Math.floor(yearValues.length * 0.90);

    const costBasis = initialCapital + monthlyContribution * 12 * year;

    points.push({
      year,
      percentile10: Math.round(yearValues[p10Idx] * 100) / 100,
      percentile50: Math.round(yearValues[p50Idx] * 100) / 100,
      percentile90: Math.round(yearValues[p90Idx] * 100) / 100,
      costBasis: Math.round(costBasis * 100) / 100,
    });
  }

  // Calculate success probability at final year
  const finalYearValues = paths.map((path) => path[timeHorizonYears]);
  const successCount = finalYearValues.filter((val) => val >= targetValue).length;
  const probabilityOfSuccess = Math.round((successCount / simulationCount) * 100);

  return {
    points,
    probabilityOfSuccess,
  };
}
