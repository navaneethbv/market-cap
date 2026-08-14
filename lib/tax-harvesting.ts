import type { HoldingRow } from "./portfolio";

export interface TaxHarvestCandidate {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedLoss: number;
  lossPercent: number;
  replacementEtfs: readonly string[];
}

export interface TaxHarvestSummary {
  candidateCount: number;
  totalUnrealizedLoss: number;
  estimatedTaxSavings: number;
  taxRatePercent: number;
  candidates: TaxHarvestCandidate[];
}

const REPLACEMENT_MAP: Record<string, readonly string[]> = {
  SPY: ["IVV", "VOO", "SCHX"],
  VOO: ["IVV", "SPY", "SPLG"],
  QQQ: ["VGT", "XLK", "QQQM"],
  AAPL: ["XLK", "VGT", "FTEC"],
  MSFT: ["XLK", "VGT", "IGV"],
  NVDA: ["SMH", "SOXX", "USD"],
  AMD: ["SMH", "SOXX", "PSI"],
  TSLA: ["XLY", "VCR", "IDRV"],
  AMZN: ["XLY", "VCR", "ONLN"],
  GOOGL: ["XLC", "VOX", "FCOM"],
  META: ["XLC", "VOX", "SOCL"],
  JPM: ["XLF", "VFH", "KBE"],
  BAC: ["XLF", "VFH", "KBWB"],
  XOM: ["XLE", "VDE", "IYE"],
  CVX: ["XLE", "VDE", "FENY"],
  LLY: ["XLV", "VHT", "IHE"],
  UNH: ["XLV", "VHT", "IHF"],
  CAT: ["XLI", "VIS", "IYJ"],
  DEFAULT: ["VOO", "VTI", "SCHD"],
};

export function getEtfReplacements(symbol: string): readonly string[] {
  const upper = symbol.trim().toUpperCase();
  return REPLACEMENT_MAP[upper] ?? REPLACEMENT_MAP.DEFAULT;
}

export function evaluateTaxLossHarvesting(
  holdings: readonly HoldingRow[],
  taxRatePercent = 15
): TaxHarvestSummary {
  const candidates: TaxHarvestCandidate[] = [];
  let totalUnrealizedLoss = 0;

  for (const h of holdings) {
    if (h.profitLoss !== null && h.profitLoss < 0) {
      const loss = Math.abs(h.profitLoss);
      totalUnrealizedLoss += loss;

      const currentPrice = h.quote?.price ?? (h.marketValue ? h.marketValue / h.shares : h.avgCost);
      const lossPercent = h.costBasis > 0 ? (loss / h.costBasis) * 100 : 0;

      candidates.push({
        id: h.id,
        symbol: h.symbol,
        shares: h.shares,
        avgCost: h.avgCost,
        currentPrice,
        costBasis: h.costBasis,
        marketValue: h.marketValue ?? 0,
        unrealizedLoss: Number(loss.toFixed(2)),
        lossPercent: Number(lossPercent.toFixed(2)),
        replacementEtfs: getEtfReplacements(h.symbol),
      });
    }
  }

  // Sort candidates by largest loss first
  candidates.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);

  const rate = Math.max(0, Math.min(100, taxRatePercent)) / 100;
  const estimatedTaxSavings = Number((totalUnrealizedLoss * rate).toFixed(2));

  return {
    candidateCount: candidates.length,
    totalUnrealizedLoss: Number(totalUnrealizedLoss.toFixed(2)),
    estimatedTaxSavings,
    taxRatePercent,
    candidates,
  };
}
