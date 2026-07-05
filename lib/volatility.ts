export function calculateProjectedMove(beta: number, marketMove: number): number {
  const result = beta * marketMove;
  return Math.round(result * 100) / 100;
}

export function calculateProjectedPrice(currentPrice: number, projectedMove: number): number {
  const result = currentPrice * (1 + projectedMove / 100);
  return Math.round(result * 100) / 100;
}

export function getBetaVolatilityLabel(beta: number): {
  label: string;
  tone: string;
  description: string;
} {
  if (beta < 0.8) {
    return {
      label: "Low Volatility (Defensive)",
      tone: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      description: "Moves less than the broader market. Ideal for risk-averse portfolios or cash-cow allocations.",
    };
  }
  if (beta <= 1.2) {
    return {
      label: "Market Volatility (Average)",
      tone: "text-violet-600 dark:text-violet-400 border-violet-500/20 bg-violet-500/10",
      description: "Fluctuates in line with the market average. Expect standard correlation and returns.",
    };
  }
  return {
    label: "High Volatility (Aggressive)",
    tone: "text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/10",
    description: "Highly sensitive to market developments. Amplifies upside returns but increases downside drawdown risk.",
  };
}
