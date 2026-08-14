import assert from "node:assert/strict";
import { test } from "node:test";
import { computeStockDimensions, buildRadarComparisonData } from "./stock-radar.ts";

test("computeStockDimensions computes valid scores between 0 and 100", () => {
  const scores = computeStockDimensions(
    "AAPL",
    {
      peRatio: 28,
      epsTTM: 6.5,
      beta: 1.1,
      dividendYield: 0.8,
      high52: 200,
      low52: 150,
    },
    { price: 190 }
  );

  assert.equal(scores.symbol, "AAPL");
  assert.ok(scores.valuation >= 0);
  assert.ok(scores.valuation <= 100);
  assert.ok(scores.profitability >= 0);
  assert.ok(scores.profitability <= 100);
  assert.ok(scores.stability >= 0);
  assert.ok(scores.stability <= 100);
  assert.ok(scores.momentum >= 0);
  assert.ok(scores.momentum <= 100);
  assert.ok(scores.growth >= 0);
  assert.ok(scores.growth <= 100);
});

test("computeStockDimensions handles null and boundary values gracefully", () => {
  const nullScores = computeStockDimensions("NULL", null, null);
  assert.equal(nullScores.valuation, 50);
  assert.equal(nullScores.profitability, 50);
  assert.equal(nullScores.stability, 50);
  assert.equal(nullScores.momentum, 50);
  assert.equal(nullScores.growth, 50);

  // Test extreme PE
  const lowPe = computeStockDimensions("LOW", { peRatio: 8 }, null);
  assert.equal(lowPe.valuation, 95);

  const highPe = computeStockDimensions("HIGH", { peRatio: 80 }, null);
  assert.equal(highPe.valuation, 20);

  // Test Beta extremes
  const lowBeta = computeStockDimensions("SAFE", { beta: 0.4 }, null);
  assert.equal(lowBeta.stability, 95);

  const highBeta = computeStockDimensions("RISKY", { beta: 2.2 }, null);
  assert.equal(highBeta.stability, 35);

  // Test Growth score tiers
  const growthHigh = computeStockDimensions("G1", { epsTTM: 10 }, { price: 100 }); // yield 10% > 6
  assert.equal(growthHigh.growth, 85);

  const growthMed = computeStockDimensions("G2", { epsTTM: 5 }, { price: 100 }); // yield 5% (4-6)
  assert.equal(growthMed.growth, 75);

  const growthLow = computeStockDimensions("G3", { epsTTM: 3 }, { price: 100 }); // yield 3% (2-4)
  assert.equal(growthLow.growth, 60);

  const growthTiny = computeStockDimensions("G4", { epsTTM: 1 }, { price: 100 }); // yield 1% (0-2)
  assert.equal(growthTiny.growth, 45);

  const growthNeg = computeStockDimensions("G5", { epsTTM: -2 }, { price: 100 }); // yield negative
  assert.equal(growthNeg.growth, 25);
});

test("buildRadarComparisonData structures data correctly for Recharts Radar", () => {
  const stock1 = computeStockDimensions("AAPL", { peRatio: 25 }, { price: 150 });
  const stock2 = computeStockDimensions("MSFT", { peRatio: 35 }, { price: 300 });

  const radarData = buildRadarComparisonData([stock1, stock2]);
  assert.equal(radarData.length, 5); // 5 dimensions
  assert.equal(radarData[0].dimension, "Valuation");
  assert.ok("AAPL" in radarData[0]);
  assert.ok("MSFT" in radarData[0]);
});
