"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  name: string;
  valuation: number;
  returnPercent: number;
  rank: number;
  isUser: boolean;
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState(5);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/portfolio/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        return res.json();
      })
      .then((data) => {
        setLeaderboard(data.leaderboard || []);
        setUserRank(data.userRank || 5);
      })
      .catch(() => {
        setErrorMsg("Failed to load leaderboard. Please make sure you are logged in.");
      })
      .finally(() => setLoading(false));
  }, []);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-amber-500 inline-block mr-1" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400 inline-block mr-1" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-700 inline-block mr-1" />;
      default:
        return <span className="text-sm font-semibold text-muted-foreground mr-3 ml-2">{rank}</span>;
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/portfolio">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paper Trading Leaderboard</h1>
          <p className="text-muted-foreground">
            See how your virtual investments rank against top mock accounts in real-time.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Compiling leaderboard rankings...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 text-center">
          {errorMsg}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-xl font-bold">
                {userRank === 1
                  ? "🥇 Leading the Market!"
                  : userRank <= 3
                  ? "🥈 Top Tier Performance!"
                  : "🎯 Keep Trading!"}
              </h2>
              <p className="text-sm text-muted-foreground">
                You are currently ranked <strong className="text-foreground">#{userRank}</strong> out of{" "}
                {leaderboard.length} traders on the network.
              </p>
            </div>
            <div className="px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl text-center">
              <span className="text-xs uppercase font-bold tracking-wider block text-primary/70">
                Your Rank
              </span>
              <span className="text-3xl font-extrabold">#{userRank}</span>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="p-4 w-20">Rank</th>
                  <th className="p-4">Trader Name</th>
                  <th className="p-4 text-right">Portfolio Value</th>
                  <th className="p-4 text-right">All-Time Return</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.name}
                    className={cn(
                      "transition-colors",
                      entry.isUser
                        ? "bg-violet-500/10 dark:bg-violet-500/15 border-l-4 border-l-violet-500 text-violet-900 dark:text-violet-200 font-semibold"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <td className="p-4 flex items-center">
                      {getRankBadge(entry.rank)}
                      {entry.rank <= 3 && (
                        <span className="text-xs font-bold text-muted-foreground">#{entry.rank}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {entry.name}
                      {entry.isUser && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-violet-500/20 text-violet-700 dark:text-violet-300 rounded-full font-bold">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono">{formatPrice(entry.valuation)}</td>
                    <td
                      className={cn(
                        "p-4 text-right font-mono font-semibold",
                        entry.returnPercent > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {entry.returnPercent > 0 ? "+" : ""}
                      {entry.returnPercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
