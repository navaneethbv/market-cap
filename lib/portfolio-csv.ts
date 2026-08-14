import { isValidSymbol, normalizeSymbol } from "./symbol.ts";
import type { NormalizedHoldingInput } from "./portfolio.ts";

export interface PortfolioCsvExportable {
  symbol: string;
  shares: number;
  avg_cost?: number;
  avgCost?: number;
  purchased_at?: string;
  purchasedAt?: string;
}

export function generatePortfolioCsv(
  holdings: readonly PortfolioCsvExportable[]
): string {
  const headers = ["Symbol", "Shares", "Avg Cost", "Purchased At"];
  const rows = holdings.map((h) => {
    const cost = h.avgCost ?? h.avg_cost ?? 0;
    const purchased = h.purchasedAt ?? h.purchased_at ?? "";
    return [
      h.symbol,
      h.shares.toString(),
      cost.toFixed(2),
      purchased ? new Date(purchased).toISOString().slice(0, 10) : "",
    ];
  });
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function parseCsvRow(
  line: string,
  rowIndex: number
): NormalizedHoldingInput | null {
  const parts = line.split(",").map((p) => p.trim().replaceAll('"', ""));
  if (parts.length < 3) return null;

  const rawSymbol = parts[0];
  const symbol = normalizeSymbol(rawSymbol);
  if (!isValidSymbol(symbol)) {
    throw new Error(`Row ${rowIndex}: Invalid ticker symbol "${rawSymbol}"`);
  }

  const shares = Number(parts[1]);
  if (!Number.isFinite(shares) || shares <= 0) {
    throw new Error(`Row ${rowIndex}: Shares must be a positive number`);
  }

  const avgCost = Number(parts[2]);
  if (!Number.isFinite(avgCost) || avgCost <= 0) {
    throw new Error(`Row ${rowIndex}: Avg Cost must be a positive number`);
  }

  let purchasedAt = new Date().toISOString();
  if (parts[3]) {
    const parsedDate = new Date(parts[3]);
    if (!Number.isNaN(parsedDate.getTime())) {
      purchasedAt = parsedDate.toISOString();
    }
  }

  return { symbol, shares, avgCost, purchasedAt };
}

export function parsePortfolioCsv(csvText: string): NormalizedHoldingInput[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const results: NormalizedHoldingInput[] = [];
  const firstCol = lines[0].split(",")[0].trim().toLowerCase().replaceAll('"', "");
  const startIndex = firstCol === "symbol" || firstCol === "ticker" ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const row = parseCsvRow(lines[i], i + 1);
    if (row) {
      results.push(row);
    }
  }

  return results;
}
