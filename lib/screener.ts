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

function matchesSector(stockSector: string, sectorFilter?: string): boolean {
  if (!sectorFilter || sectorFilter === "All") return true;
  return stockSector === sectorFilter;
}

function matchesMarketCap(marketCap: number, capFilter?: string): boolean {
  if (!capFilter || capFilter === "All") return true;
  if (capFilter === "Mega") return marketCap >= 100;
  if (capFilter === "Large") return marketCap >= 10 && marketCap < 100;
  if (capFilter === "MidSmall") return marketCap < 10;
  return true;
}

function matchesValuation(peRatio: number | null, dividendYield: number | null, valuationFilter?: string): boolean {
  if (!valuationFilter || valuationFilter === "All") return true;
  if (valuationFilter === "Growth") return peRatio !== null && peRatio > 30;
  if (valuationFilter === "Value") return peRatio !== null && peRatio < 15;
  if (valuationFilter === "Income") return dividendYield !== null && dividendYield > 2.0;
  return true;
}

export function filterScreenerStocks(
  stocks: ScreenerStock[],
  filters: {
    sector?: string;
    marketCap?: string;
    valuation?: string;
  }
): ScreenerStock[] {
  return stocks.filter((stock) => {
    if (!matchesSector(stock.sector, filters.sector)) return false;
    if (!matchesMarketCap(stock.marketCap, filters.marketCap)) return false;
    if (!matchesValuation(stock.peRatio, stock.dividendYield, filters.valuation)) return false;
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
    sorted.sort((a, b) => (a.peRatio ?? Infinity) - (b.peRatio ?? Infinity));
  } else if (sortBy === "dividendYield") {
    sorted.sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0));
  } else if (sortBy === "changePercent") {
    sorted.sort((a, b) => b.changePercent - a.changePercent);
  }
  return sorted;
}
