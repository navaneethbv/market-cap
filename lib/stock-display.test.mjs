import assert from "node:assert/strict";
import { test } from "node:test";

const { buildStockStats, getChartTone } = await import("./stock-display.ts");

test("buildStockStats formats Finnhub market cap from millions to dollars", () => {
  const stats = buildStockStats({
    quote: {
      symbol: "AAPL",
      price: 212.4,
      change: 1.25,
      changePercent: 0.59,
      high: 214.1,
      low: 209.3,
      open: 210.5,
      prevClose: 211.15,
      timestamp: 1760000000,
    },
    profile: {
      symbol: "AAPL",
      name: "Apple Inc",
      exchange: "NASDAQ",
      industry: "Technology",
      logo: "",
      weburl: "",
      ipo: "",
      marketCap: 3240000,
      sharesOutstanding: 15200,
    },
    metrics: {
      high52: 260.1,
      low52: 169.2,
      peRatio: 31.25,
      beta: 1.12,
      dividendYield: 0.48,
      epsTTM: 6.8,
    },
  });

  assert.deepEqual(
    stats.map((stat) => [stat.label, stat.value]),
    [
      ["Open", "$210.50"],
      ["Day high", "$214.10"],
      ["Day low", "$209.30"],
      ["Prev close", "$211.15"],
      ["Market cap", "$3.24T"],
      ["P/E ratio", "31.25"],
      ["52w high", "$260.10"],
      ["52w low", "$169.20"],
      ["Dividend yield", "0.48%"],
      ["Beta", "1.12"],
      ["EPS", "$6.80"],
    ]
  );
});

test("buildStockStats falls back for missing nullable metrics", () => {
  const stats = buildStockStats({
    quote: {
      symbol: "MSFT",
      price: 510,
      change: 0,
      changePercent: 0,
      high: 0,
      low: 0,
      open: 0,
      prevClose: 0,
      timestamp: 1760000000,
    },
    profile: {
      symbol: "MSFT",
      name: "Microsoft",
      exchange: "NASDAQ",
      industry: "Technology",
      logo: "",
      weburl: "",
      ipo: "",
      marketCap: 0,
      sharesOutstanding: 0,
    },
    metrics: {
      high52: null,
      low52: null,
      peRatio: null,
      beta: null,
      dividendYield: null,
      epsTTM: null,
    },
  });

  assert.equal(stats.find((stat) => stat.label === "Market cap")?.value, "-");
  assert.equal(stats.find((stat) => stat.label === "P/E ratio")?.value, "-");
  assert.equal(stats.find((stat) => stat.label === "EPS")?.value, "-");
});

test("getChartTone compares first and last close", () => {
  assert.equal(
    getChartTone([
      { time: "2026-01-01", open: 10, high: 11, low: 9, close: 10, volume: 1 },
      { time: "2026-01-02", open: 10, high: 13, low: 10, close: 12, volume: 1 },
    ]),
    "up"
  );

  assert.equal(
    getChartTone([
      { time: "2026-01-01", open: 10, high: 11, low: 9, close: 10, volume: 1 },
      { time: "2026-01-02", open: 10, high: 10, low: 8, close: 8, volume: 1 },
    ]),
    "down"
  );
});
