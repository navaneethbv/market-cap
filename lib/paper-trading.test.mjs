import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPaperPortfolio,
  buildPaperPositionRows,
  buildPaperSummary,
  normalizePaperTradeInput,
  validatePaperTrade,
} from "./paper-trading.ts";

test("normalizePaperTradeInput uppercases symbols and parses whole shares", () => {
  assert.deepEqual(
    normalizePaperTradeInput({ symbol: " aapl ", side: "buy", shares: "10" }),
    { symbol: "AAPL", side: "buy", shares: 10 }
  );
});

test("normalizePaperTradeInput rejects invalid input", () => {
  assert.throws(
    () => normalizePaperTradeInput({ symbol: "not a symbol", side: "buy", shares: "1" }),
    /Invalid symbol/
  );
  assert.throws(
    () => normalizePaperTradeInput({ symbol: "AAPL", side: "hold", shares: "1" }),
    /Invalid trade side/
  );
  for (const shares of ["0", "-3", "1.5", "abc", ""]) {
    assert.throws(
      () => normalizePaperTradeInput({ symbol: "AAPL", side: "sell", shares }),
      /Shares must be a positive whole number/
    );
  }
});

function trade(overrides) {
  return {
    id: "t",
    symbol: "AAPL",
    side: "buy",
    shares: 1,
    price: 100,
    executed_at: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

test("buildPaperPortfolio averages cost across buys", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "1", shares: 10, price: 100, executed_at: "2026-07-01T10:00:00Z" }),
    trade({ id: "2", shares: 10, price: 200, executed_at: "2026-07-01T11:00:00Z" }),
  ]);

  assert.equal(portfolio.cashDelta, -3000);
  assert.equal(portfolio.realizedPnl, 0);
  assert.deepEqual(portfolio.positions, [
    { symbol: "AAPL", shares: 20, avgCost: 150, costBasis: 3000 },
  ]);
});

test("buildPaperPortfolio realizes P&L on sells at average cost", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "1", shares: 10, price: 100, executed_at: "2026-07-01T10:00:00Z" }),
    trade({ id: "2", shares: 10, price: 200, executed_at: "2026-07-01T11:00:00Z" }),
    trade({ id: "3", side: "sell", shares: 5, price: 180, executed_at: "2026-07-01T12:00:00Z" }),
  ]);

  assert.equal(portfolio.cashDelta, -2100);
  assert.equal(portfolio.realizedPnl, 150);
  assert.deepEqual(portfolio.positions, [
    { symbol: "AAPL", shares: 15, avgCost: 150, costBasis: 2250 },
  ]);
});

test("buildPaperPortfolio removes fully sold positions and sorts by symbol", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "1", symbol: "MSFT", shares: 2, price: 50, executed_at: "2026-07-01T10:00:00Z" }),
    trade({ id: "2", symbol: "AAPL", shares: 3, price: 10, executed_at: "2026-07-01T11:00:00Z" }),
    trade({ id: "3", symbol: "MSFT", side: "sell", shares: 2, price: 60, executed_at: "2026-07-01T12:00:00Z" }),
  ]);

  assert.equal(portfolio.realizedPnl, 20);
  assert.deepEqual(
    portfolio.positions.map((position) => position.symbol),
    ["AAPL"]
  );
});

test("buildPaperPortfolio handles an empty ledger", () => {
  assert.deepEqual(buildPaperPortfolio([]), {
    cashDelta: 0,
    positions: [],
    realizedPnl: 0,
  });
});

test("normalizePaperTradeInput accepts sells and number-typed shares", () => {
  assert.deepEqual(
    normalizePaperTradeInput({ symbol: "msft", side: "sell", shares: 10 }),
    { symbol: "MSFT", side: "sell", shares: 10 }
  );
  assert.throws(
    () => normalizePaperTradeInput({ symbol: "MSFT", side: "sell", shares: 1.5 }),
    /Shares must be a positive whole number/
  );
});

test("buildPaperPortfolio sorts trades by executed_at before deriving", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "3", side: "sell", shares: 5, price: 180, executed_at: "2026-07-01T12:00:00Z" }),
    trade({ id: "1", shares: 10, price: 100, executed_at: "2026-07-01T10:00:00Z" }),
    trade({ id: "2", shares: 10, price: 200, executed_at: "2026-07-01T11:00:00Z" }),
  ]);

  assert.equal(portfolio.cashDelta, -2100);
  assert.equal(portfolio.realizedPnl, 150);
  assert.deepEqual(portfolio.positions, [
    { symbol: "AAPL", shares: 15, avgCost: 150, costBasis: 2250 },
  ]);
});

test("buildPaperPortfolio books a no-position sell as pure realized proceeds", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "1", side: "sell", shares: 2, price: 50 }),
  ]);

  assert.equal(portfolio.cashDelta, 100);
  assert.equal(portfolio.realizedPnl, 100);
  assert.deepEqual(portfolio.positions, []);
});

test("buildPaperPortfolio re-establishes cost basis after full liquidation", () => {
  const portfolio = buildPaperPortfolio([
    trade({ id: "1", shares: 10, price: 100, executed_at: "2026-07-01T10:00:00Z" }),
    trade({ id: "2", side: "sell", shares: 10, price: 120, executed_at: "2026-07-01T11:00:00Z" }),
    trade({ id: "3", shares: 4, price: 300, executed_at: "2026-07-01T12:00:00Z" }),
  ]);

  assert.equal(portfolio.realizedPnl, 200);
  assert.deepEqual(portfolio.positions, [
    { symbol: "AAPL", shares: 4, avgCost: 300, costBasis: 1200 },
  ]);
});

test("validatePaperTrade rejects overspending and overselling", () => {
  assert.equal(
    validatePaperTrade({ side: "buy", shares: 1, price: Number.NaN, cash: 1000, positionShares: 0 }),
    "No valid market price for this order"
  );
  assert.equal(
    validatePaperTrade({ side: "buy", shares: 1, price: 0, cash: 1000, positionShares: 0 }),
    "No valid market price for this order"
  );
  assert.equal(
    validatePaperTrade({ side: "sell", shares: 1, price: -5, cash: 0, positionShares: 2 }),
    "No valid market price for this order"
  );
  assert.equal(
    validatePaperTrade({ side: "buy", shares: 10, price: 100, cash: 999, positionShares: 0 }),
    "Insufficient cash for this order"
  );
  assert.equal(
    validatePaperTrade({ side: "sell", shares: 5, price: 100, cash: 0, positionShares: 4 }),
    "Not enough shares to sell"
  );
  assert.equal(
    validatePaperTrade({ side: "buy", shares: 10, price: 100, cash: 1000, positionShares: 0 }),
    null
  );
  assert.equal(
    validatePaperTrade({ side: "sell", shares: 4, price: 100, cash: 0, positionShares: 4 }),
    null
  );
});

test("buildPaperPositionRows pairs quotes and marks failures", () => {
  const positions = [
    { symbol: "AAPL", shares: 15, avgCost: 150, costBasis: 2250 },
    { symbol: "MSFT", shares: 2, avgCost: 50, costBasis: 100 },
  ];
  const rows = buildPaperPositionRows(positions, [
    { status: "fulfilled", value: { symbol: "AAPL", price: 160 } },
    { status: "rejected", reason: new Error("quota exceeded") },
  ]);

  assert.equal(rows[0].marketValue, 2400);
  assert.equal(rows[0].unrealizedPnl, 150);
  assert.ok(Math.abs(rows[0].unrealizedPnlPercent - 6.6666) < 0.001);
  assert.equal(rows[0].error, null);

  assert.equal(rows[1].marketValue, null);
  assert.equal(rows[1].unrealizedPnl, null);
  assert.equal(rows[1].error, "quota exceeded");
});

test("buildPaperSummary combines cash, market value, and P&L", () => {
  const portfolio = {
    cashDelta: -2100,
    realizedPnl: 150,
    positions: [{ symbol: "AAPL", shares: 15, avgCost: 150, costBasis: 2250 }],
  };
  const rows = buildPaperPositionRows(portfolio.positions, [
    { status: "fulfilled", value: { symbol: "AAPL", price: 160 } },
  ]);
  const summary = buildPaperSummary({
    startingCash: 100000,
    portfolio,
    positionRows: rows,
  });

  assert.equal(summary.cash, 97900);
  assert.equal(summary.marketValue, 2400);
  assert.equal(summary.equity, 100300);
  assert.equal(summary.unrealizedPnl, 150);
  assert.equal(summary.realizedPnl, 150);
  assert.equal(summary.totalReturn, 300);
  assert.equal(summary.totalReturnPercent, 0.3);
});

test("buildPaperSummary counts unquoted positions at cost basis", () => {
  const portfolio = {
    cashDelta: -100,
    realizedPnl: 0,
    positions: [{ symbol: "MSFT", shares: 2, avgCost: 50, costBasis: 100 }],
  };
  const rows = buildPaperPositionRows(portfolio.positions, [
    { status: "rejected", reason: new Error("no quote") },
  ]);
  const summary = buildPaperSummary({
    startingCash: 100000,
    portfolio,
    positionRows: rows,
  });

  assert.equal(summary.marketValue, 100);
  assert.equal(summary.equity, 100000);
  assert.equal(summary.unrealizedPnl, 0);
});
