import assert from "node:assert/strict";
import { test } from "node:test";
import { getHeatmapColor, buildSectorHeatmapData } from "./heatmap.ts";

test("getHeatmapColor returns appropriate color shades based on delta", () => {
  assert.equal(getHeatmapColor(3.5), "rgb(16, 185, 129)");
  assert.equal(getHeatmapColor(2.0), "rgb(34, 197, 94)");
  assert.equal(getHeatmapColor(0.8), "rgb(74, 222, 128)");
  assert.equal(getHeatmapColor(0.1), "rgb(100, 116, 139)");
  assert.equal(getHeatmapColor(-0.1), "rgb(100, 116, 139)");
  assert.equal(getHeatmapColor(-1.0), "rgb(248, 113, 113)");
  assert.equal(getHeatmapColor(-2.5), "rgb(239, 68, 68)");
  assert.equal(getHeatmapColor(-4.0), "rgb(220, 38, 38)");
});

test("buildSectorHeatmapData groups stocks by sector and calculates weighted change", () => {
  const stocks = [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      sector: "Technology",
      marketCap: 3000,
      price: 180,
      change: 3,
      changePercent: 1.6,
      peRatio: 30,
      dividendYield: 0.5,
      beta: 1.1,
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corp.",
      sector: "Technology",
      marketCap: 3000,
      price: 400,
      change: -4,
      changePercent: -1.0,
      peRatio: 35,
      dividendYield: 0.8,
      beta: 1.0,
    },
    {
      symbol: "JPM",
      name: "JPMorgan Chase",
      sector: "Financials",
      marketCap: 500,
      price: 200,
      change: 2,
      changePercent: 1.0,
      peRatio: 12,
      dividendYield: 2.5,
      beta: 1.1,
    },
  ];

  const heatmap = buildSectorHeatmapData(stocks);
  assert.equal(heatmap.length, 2); // Technology, Financials

  // Technology should be first due to larger market cap
  assert.equal(heatmap[0].sector, "Technology");
  assert.equal(heatmap[0].totalMarketCap, 6000);
  // Weighted change: (1.6 * 3000 + -1.0 * 3000) / 6000 = 0.6 / 2 = 0.3%
  assert.equal(heatmap[0].weightedChangePercent, 0.3);
  assert.equal(heatmap[0].stocks.length, 2);

  assert.equal(heatmap[1].sector, "Financials");
  assert.equal(heatmap[1].totalMarketCap, 500);
  assert.equal(heatmap[1].weightedChangePercent, 1.0);
});

test("buildSectorHeatmapData handles empty or zero market cap stocks", () => {
  assert.deepEqual(buildSectorHeatmapData([]), []);

  const zeroCap = [
    {
      symbol: "ZERO",
      name: "Zero Cap",
      sector: "Other",
      marketCap: 0,
      price: 10,
      change: 0,
      changePercent: 0,
      peRatio: null,
      dividendYield: null,
      beta: null,
    },
  ];
  const res = buildSectorHeatmapData(zeroCap);
  assert.equal(res.length, 1);
  assert.equal(res[0].weightedChangePercent, 0);
});
