import type { Quote } from "./market/types";
import {
  buildPaperEquitySnapshot,
  buildPaperPortfolio,
  type PaperEquitySnapshot,
  type PaperTrade,
} from "./paper-trading.ts";

export interface PaperEquitySnapshotDependencies {
  loadStartingCash(userId: string): Promise<number>;
  loadTrades(userId: string): Promise<PaperTrade[]>;
  getQuotes(symbols: string[]): Promise<PromiseSettledResult<Quote>[]>;
  saveSnapshot(userId: string, equity: number): Promise<void>;
}

export async function recordPaperEquitySnapshot(
  userId: string,
  dependencies: PaperEquitySnapshotDependencies
): Promise<PaperEquitySnapshot> {
  const [startingCash, trades] = await Promise.all([
    dependencies.loadStartingCash(userId),
    dependencies.loadTrades(userId),
  ]);
  const portfolio = buildPaperPortfolio(trades);
  const quoteResults = await dependencies.getQuotes(
    portfolio.positions.map((position) => position.symbol)
  );
  const snapshot = buildPaperEquitySnapshot({
    startingCash,
    portfolio,
    quoteResults,
  });

  await dependencies.saveSnapshot(userId, snapshot.equity);
  return snapshot;
}
