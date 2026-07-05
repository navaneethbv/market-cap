import assert from "node:assert/strict";
import { test } from "node:test";
import { randomNormal, runMonteCarloSimulation } from "./monte-carlo.ts";

test("randomNormal generates values with non-zero variation", () => {
  const values = Array.from({ length: 100 }, () => randomNormal());
  const mean = values.reduce((s, v) => s + v, 0) / 100;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 100;

  // Expected standard normal variance is 1.0; check that it is reasonably positive.
  assert.ok(variance > 0.2);
});

test("runMonteCarloSimulation returns correct points with zero return and volatility", () => {
  const result = runMonteCarloSimulation({
    initialCapital: 10000,
    monthlyContribution: 100,
    annualReturn: 0,
    annualVolatility: 0,
    timeHorizonYears: 5,
    simulationCount: 10,
    targetValue: 12000,
  });

  assert.equal(result.points.length, 6); // Year 0 to 5
  // At Year 5, portfolio should be initialCapital + 5 * 12 * monthlyContribution = 10000 + 6000 = 16000
  const finalPoint = result.points[5];
  assert.equal(finalPoint.percentile50, 16000);
  assert.equal(finalPoint.percentile10, 16000);
  assert.equal(finalPoint.percentile90, 16000);
  assert.equal(finalPoint.costBasis, 16000);
  assert.equal(result.probabilityOfSuccess, 100); // 16000 >= 12000 is 100% success
});

test("runMonteCarloSimulation handles positive growth distribution", () => {
  const result = runMonteCarloSimulation({
    initialCapital: 10000,
    monthlyContribution: 200,
    annualReturn: 0.08,
    annualVolatility: 0.15,
    timeHorizonYears: 10,
    simulationCount: 50,
    targetValue: 50000,
  });

  const finalPoint = result.points[10];
  // 90th percentile should be strictly greater than 10th percentile due to random volatility path dispersion
  assert.ok(finalPoint.percentile90 > finalPoint.percentile10);
  assert.ok(result.probabilityOfSuccess >= 0 && result.probabilityOfSuccess <= 100);
});

test("runMonteCarloSimulation is repeatable for the same seed", () => {
  const input = {
    initialCapital: 10000,
    monthlyContribution: 200,
    annualReturn: 0.08,
    annualVolatility: 0.15,
    timeHorizonYears: 10,
    simulationCount: 50,
    targetValue: 50000,
    seed: 123,
  };

  assert.deepEqual(runMonteCarloSimulation(input), runMonteCarloSimulation(input));
});

test("runMonteCarloSimulation rejects invalid simulation bounds", () => {
  assert.throws(
    () =>
      runMonteCarloSimulation({
        initialCapital: 10000,
        monthlyContribution: 100,
        annualReturn: 0.05,
        annualVolatility: 0.1,
        timeHorizonYears: 0,
        simulationCount: 10,
        targetValue: 20000,
      }),
    /time horizon must be at least 1 year/
  );

  assert.throws(
    () =>
      runMonteCarloSimulation({
        initialCapital: 10000,
        monthlyContribution: 100,
        annualReturn: 0.05,
        annualVolatility: 0.1,
        timeHorizonYears: 5,
        simulationCount: 0,
        targetValue: 20000,
      }),
    /simulation count must be at least 1/
  );
});
