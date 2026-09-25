/** Five-year EPS-based discounted valuation with a perpetual terminal value. */
export function computeDCF(eps: number, growth: number, discount: number, terminal: number): number | null {
  if (![eps, growth, discount, terminal].every(Number.isFinite) || eps <= 0 || growth <= -100 || terminal <= -100 || discount <= 0 || discount <= terminal) {
    return null;
  }
  const g = growth / 100;
  const d = discount / 100;
  const tg = terminal / 100;
  let pvSum = 0;
  let epsT = eps;
  for (let year = 1; year <= 5; year++) {
    epsT *= 1 + g;
    pvSum += epsT / Math.pow(1 + d, year);
  }
  const value = pvSum + ((epsT * (1 + tg)) / (d - tg)) / Math.pow(1 + d, 5);
  return Number.isFinite(value) ? value : null;
}
