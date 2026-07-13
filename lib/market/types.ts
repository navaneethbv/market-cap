export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: number;
}

export interface SymbolSearchResult {
  symbol: string;
  description: string;
  type: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  industry: string;
  logo: string;
  weburl: string;
  ipo: string;
  marketCap: number; // in millions USD
  sharesOutstanding: number; // in millions
}

export interface KeyMetrics {
  high52: number | null;
  low52: number | null;
  peRatio: number | null;
  beta: number | null;
  dividendYield: number | null;
  epsTTM: number | null;
}

export interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  related: string;
}

export interface Candle {
  time: string; // ISO datetime
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartRange = "1D" | "1W" | "1M" | "6M" | "1Y" | "5Y";

export interface InsiderTransaction {
  symbol: string;
  name: string;
  share: number;
  change: number;
  price: number;
  date: string;
  filingDate: string;
  transactionCode: string;
  isDerivative: boolean;
}
