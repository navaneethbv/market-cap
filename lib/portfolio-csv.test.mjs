import assert from "node:assert/strict";
import { test } from "node:test";
import { generatePortfolioCsv, parsePortfolioCsv } from "./portfolio-csv.ts";

test("generatePortfolioCsv generates valid CSV string with headers", () => {
  const holdings = [
    {
      id: "1",
      symbol: "AAPL",
      shares: 10,
      avg_cost: 150.5,
      purchased_at: "2026-01-15T00:00:00.000Z",
      created_at: "2026-01-15T00:00:00.000Z",
    },
    {
      id: "2",
      symbol: "MSFT",
      shares: 5,
      avg_cost: 320,
      purchased_at: "2026-02-01T00:00:00.000Z",
      created_at: "2026-02-01T00:00:00.000Z",
    },
  ];

  const csv = generatePortfolioCsv(holdings);
  assert.ok(csv.startsWith("Symbol,Shares,Avg Cost,Purchased At"));
  assert.ok(csv.includes("AAPL,10,150.50,2026-01-15"));
  assert.ok(csv.includes("MSFT,5,320.00,2026-02-01"));
});

test("parsePortfolioCsv parses headered and headerless CSV", () => {
  const csvWithHeader = `Symbol,Shares,Avg Cost,Purchased At
AAPL,10,150.50,2026-01-15
MSFT,5,320,2026-02-01`;

  const parsed = parsePortfolioCsv(csvWithHeader);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].symbol, "AAPL");
  assert.equal(parsed[0].shares, 10);
  assert.equal(parsed[0].avgCost, 150.5);
  assert.ok(parsed[0].purchasedAt.startsWith("2026-01-15"));

  const csvWithoutHeader = `GOOG,20,180.25,2026-03-01`;
  const parsed2 = parsePortfolioCsv(csvWithoutHeader);
  assert.equal(parsed2.length, 1);
  assert.equal(parsed2[0].symbol, "GOOG");
});

test("parsePortfolioCsv handles empty string", () => {
  assert.deepEqual(parsePortfolioCsv(""), []);
  assert.deepEqual(parsePortfolioCsv("   \n\n  "), []);
});

test("parsePortfolioCsv rejects invalid symbol or numbers", () => {
  assert.throws(
    () => parsePortfolioCsv("NOT A SYMBOL,10,100"),
    /Invalid ticker symbol/
  );
  assert.throws(
    () => parsePortfolioCsv("AAPL,-5,100"),
    /Shares must be a positive number/
  );
  assert.throws(
    () => parsePortfolioCsv("AAPL,10,0"),
    /Avg Cost must be a positive number/
  );
});
