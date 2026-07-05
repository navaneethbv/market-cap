export interface ScreenerStock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null;
  beta: number | null;
  price: number;
  change: number;
  changePercent: number;
}

export const SCREENER_CATALOG = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology" },
  { symbol: "NVDA", name: "Nvidia Corporation", sector: "Technology" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology" },
  { symbol: "INTC", name: "Intel Corporation", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical" },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical" },
  { symbol: "MCD", name: "McDonald's Corporation", sector: "Consumer Cyclical" },
  { symbol: "NKE", name: "Nike Inc.", sector: "Consumer Cyclical" },
  { symbol: "HD", name: "Home Depot Inc.", sector: "Consumer Cyclical" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Class A)", sector: "Communication Services" },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Communication Services" },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication Services" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financials" },
  { symbol: "BAC", name: "Bank of America Corp.", sector: "Financials" },
  { symbol: "V", name: "Visa Inc.", sector: "Financials" },
  { symbol: "MA", name: "Mastercard Inc.", sector: "Financials" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive" },
  { symbol: "COST", name: "Costco Wholesale Corp.", sector: "Consumer Defensive" },
  { symbol: "PG", name: "Procter & Gamble Co.", sector: "Consumer Defensive" },
  { symbol: "KO", name: "Coca-Cola Company", sector: "Consumer Defensive" },
  { symbol: "PEP", name: "PepsiCo Inc.", sector: "Consumer Defensive" },
  { symbol: "LLY", name: "Eli Lilly & Co.", sector: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "UNH", name: "UnitedHealth Group Inc.", sector: "Healthcare" },
  { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare" },
  { symbol: "XOM", name: "Exxon Mobil Corp.", sector: "Energy" },
  { symbol: "CVX", name: "Chevron Corp.", sector: "Energy" },
  { symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrials" },
  { symbol: "GE", name: "General Electric Co.", sector: "Industrials" },
];

export function filterScreenerStocks(
  stocks: ScreenerStock[],
  filters: {
    sector?: string;
    marketCap?: string;
    valuation?: string;
  }
): ScreenerStock[] {
  return stocks.filter((stock) => {
    // 1. Sector filter
    if (filters.sector && filters.sector !== "All") {
      if (stock.sector !== filters.sector) return false;
    }

    // 2. Market Cap filter
    if (filters.marketCap && filters.marketCap !== "All") {
      const capInBillions = stock.marketCap;
      if (filters.marketCap === "Mega" && capInBillions < 100) return false;
      if (filters.marketCap === "Large" && (capInBillions < 10 || capInBillions >= 100)) return false;
      if (filters.marketCap === "MidSmall" && capInBillions >= 10) return false;
    }

    // 3. Valuation filter
    if (filters.valuation && filters.valuation !== "All") {
      const pe = stock.peRatio;
      const yieldPct = stock.dividendYield;
      if (filters.valuation === "Growth" && (pe === null || pe <= 30)) return false;
      if (filters.valuation === "Value" && (pe === null || pe >= 15)) return false;
      if (filters.valuation === "Income" && (yieldPct === null || yieldPct <= 2.0)) return false;
    }

    return true;
  });
}

export function sortScreenerStocks(
  stocks: ScreenerStock[],
  sortBy: string
): ScreenerStock[] {
  const sorted = [...stocks];
  if (sortBy === "marketCap") {
    sorted.sort((a, b) => b.marketCap - a.marketCap);
  } else if (sortBy === "peRatio") {
    // Put null values at the end
    sorted.sort((a, b) => {
      if (a.peRatio === null) return 1;
      if (b.peRatio === null) return -1;
      return a.peRatio - b.peRatio;
    });
  } else if (sortBy === "dividendYield") {
    sorted.sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0));
  } else if (sortBy === "changePercent") {
    sorted.sort((a, b) => b.changePercent - a.changePercent);
  }
  return sorted;
}
