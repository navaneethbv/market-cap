export interface LeaderboardEntry {
  name: string;
  valuation: number;
  returnPercent: number;
  rank?: number;
  isUser: boolean;
}

export function compileLeaderboard(
  competitors: LeaderboardEntry[],
  userValuation: number
): { leaderboard: LeaderboardEntry[]; userRank: number } {
  const returnPercent = ((userValuation - 100000.0) / 100000.0) * 100;
  
  const userEntry: LeaderboardEntry = {
    name: "You (Paper Account)",
    valuation: Math.round(userValuation * 100) / 100,
    returnPercent: Math.round(returnPercent * 100) / 100,
    isUser: true,
  };

  const combined = [...competitors, userEntry].sort((a, b) => b.valuation - a.valuation);

  combined.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  const userRank = combined.find((e) => e.isUser)?.rank ?? 5;

  return {
    leaderboard: combined,
    userRank,
  };
}
