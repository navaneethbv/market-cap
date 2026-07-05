import assert from "node:assert/strict";
import { test } from "node:test";
import { compileLeaderboard } from "./leaderboard.ts";

const competitors = [
  { name: "Pelosi Tracker", valuation: 150000, returnPercent: 50.0, isUser: false },
  { name: "Alpha Whale", valuation: 120000, returnPercent: 20.0, isUser: false },
];

test("compileLeaderboard integrates user and sorts correctly", () => {
  // Scenario 1: User is rank 1
  const result1 = compileLeaderboard(competitors, 160000);
  assert.equal(result1.userRank, 1);
  assert.equal(result1.leaderboard[0].name, "You (Paper Account)");
  assert.equal(result1.leaderboard[0].returnPercent, 60.0); // (160k - 100k) / 100k * 100

  // Scenario 2: User is rank 2
  const result2 = compileLeaderboard(competitors, 130000);
  assert.equal(result2.userRank, 2);
  assert.equal(result2.leaderboard[1].name, "You (Paper Account)");
  assert.equal(result2.leaderboard[1].returnPercent, 30.0);

  // Scenario 3: User is rank 3
  const result3 = compileLeaderboard(competitors, 110000);
  assert.equal(result3.userRank, 3);
  assert.equal(result3.leaderboard[2].name, "You (Paper Account)");
  assert.equal(result3.leaderboard[2].returnPercent, 10.0);
});
