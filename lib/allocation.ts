export interface AllocationSourceRow {
  symbol: string;
  marketValue: number | null;
}

export type AllocationRow<T extends AllocationSourceRow = AllocationSourceRow> = T & {
  weightPercent: number | null;
};

export interface AllocationSummary {
  totalMarketValue: number;
  positionCount: number;
  pricedPositionCount: number;
  largest: AllocationRow | null;
  largestWeightPercent: number;
  concentrationLabel: string;
}

export function buildAllocationRows<T extends AllocationSourceRow>(
  rows: T[]
): AllocationRow<T>[] {
  const totalMarketValue = rows.reduce(
    (total, row) => total + (row.marketValue ?? 0),
    0
  );

  return rows
    .map((row): AllocationRow<T> => ({
      ...row,
      weightPercent:
        row.marketValue === null || totalMarketValue === 0
          ? null
          : (row.marketValue / totalMarketValue) * 100,
    }))
    .sort((a, b) => (b.weightPercent ?? -1) - (a.weightPercent ?? -1));
}

export function getConcentrationLabel(weightPercent: number): string {
  if (weightPercent >= 35) {
    return "High concentration";
  }
  if (weightPercent >= 20) {
    return "Moderate concentration";
  }
  return "Balanced";
}

export function calculateAllocationSummary(
  rows: AllocationSourceRow[]
): AllocationSummary {
  const allocationRows = buildAllocationRows(rows);
  const totalMarketValue = rows.reduce(
    (total, row) => total + (row.marketValue ?? 0),
    0
  );
  const pricedPositionCount = rows.filter((row) => row.marketValue !== null).length;
  const largest = allocationRows.find((row) => row.weightPercent !== null) ?? null;
  const largestWeightPercent = largest?.weightPercent ?? 0;

  return {
    totalMarketValue,
    positionCount: rows.length,
    pricedPositionCount,
    largest,
    largestWeightPercent,
    concentrationLabel: getConcentrationLabel(largestWeightPercent),
  };
}
