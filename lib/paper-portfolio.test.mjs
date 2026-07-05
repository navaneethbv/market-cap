import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizePaperTradeInput,
  buildPaperHoldingRows,
  calculatePaperPortfolioSummary,
} from "./paper-portfolio.ts";

test("normalizePaperTradeInput normalizes and validates inputs", () => {
  const result = normalizePaperTradeInput(" aapl ", "10.5", 150);
  assert.equal(result.symbol, "AAPL");
  assert.equal(result.shares, 10.5);
  assert.equal(result.price, 150);

  assert.throws(() => normalizePaperTradeInput("INVALID_TICKER_SYMBOL_TOO_LONG", 10, 150), /Invalid symbol/);
  assert.throws(() => normalizePaperTradeInput("AAPL", -5, 150), /Shares must be greater than zero/);
  assert.throws(() => normalizePaperTradeInput("AAPL", 10, 0), /Price must be greater than zero/);
});

test("buildPaperHoldingRows calculates market value and returns correctly", () => {
  const holdings = [
    {
      id: "1",
      symbol: "AAPL",
      shares: 10,
      avg_cost: 150,
      purchased_at: "2026-06-01",
      created_at: "2026-06-01T12:00:00Z",
    },
  ];

  const quotes = [
    {
      status: "fulfilled",
      value: {
        symbol: "AAPL",
        price: 180,
        change: 5,
        changePercent: 2.8,
        high: 181,
        low: 178,
        open: 179,
        prevClose: 175,
        timestamp: 12345,
      },
    },
  ];

  const rows = buildPaperHoldingRows(holdings, quotes);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].costBasis, 1500);
  assert.equal(rows[0].marketValue, 1800);
  assert.equal(rows[0].profitLoss, 300);
  assert.equal(rows[0].profitLossPercent, 20);
});

test("calculatePaperPortfolioSummary summarizes correctly", () => {
  const rows = [
    {
      id: "1",
      symbol: "AAPL",
      shares: 10,
      avgCost: 150,
      purchasedAt: "2026-06-01",
      quote: null,
      marketValue: 1800,
      costBasis: 1500,
      profitLoss: 300,
      profitLossPercent: 20,
      error: null,
    },
  ];

  const summary = calculatePaperPortfolioSummary(rows, 5000);
  assert.equal(summary.holdingsValue, 1800);
  assert.equal(summary.cashBalance, 5000);
  assert.equal(summary.totalValue, 6800);
  assert.equal(summary.costBasis, 1500);
  assert.equal(summary.profitLoss, 300);
  assert.equal(summary.profitLossPercent, 20);
});
