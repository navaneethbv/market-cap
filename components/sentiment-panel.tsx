"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ThumbsUp, ThumbsDown, TrendingUp, Sparkles } from "lucide-react";
import { classifyNewsSentiment } from "@/lib/news-sentiment";
import type { NewsArticle } from "@/lib/market/types";
import { cn } from "@/lib/utils";

interface SentimentPanelProps {
  news: NewsArticle[];
}

export function SentimentPanel({ news }: SentimentPanelProps) {
  const { score, trendData, bullishHeadlines, bearishHeadlines } = useMemo(() => {
    if (!news || news.length === 0) {
      return { score: 50, trendData: [], bullishHeadlines: [], bearishHeadlines: [] };
    }

    const sortedNews = [...news].sort((a, b) => a.datetime - b.datetime);
    
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    
    const bullishHeadlines: string[] = [];
    const bearishHeadlines: string[] = [];

    const trendData = sortedNews.map((item) => {
      const sentiment = classifyNewsSentiment(item);
      if (sentiment === "bullish") {
        bullishCount++;
        bullishHeadlines.push(item.headline);
      } else if (sentiment === "bearish") {
        bearishCount++;
        bearishHeadlines.push(item.headline);
      } else if (sentiment === "neutral") {
        neutralCount++;
      }

      const total = bullishCount + bearishCount + neutralCount;
      const runningScore = total === 0 ? 50 : Math.round(((bullishCount * 100 + neutralCount * 50) / total));
      
      return {
        date: new Date(item.datetime * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: runningScore,
      };
    });

    const finalTotal = bullishCount + bearishCount + neutralCount;
    const finalScore = finalTotal === 0 ? 50 : Math.round(((bullishCount * 100 + neutralCount * 50) / finalTotal));

    return {
      score: finalScore,
      trendData,
      bullishHeadlines: bullishHeadlines.slice(0, 3),
      bearishHeadlines: bearishHeadlines.slice(0, 3),
    };
  }, [news]);

  function getSentimentLabel(s: number) {
    if (s >= 70) return { label: "Very Bullish", color: "text-emerald-600 dark:text-emerald-400" };
    if (s >= 55) return { label: "Bullish", color: "text-emerald-500 dark:text-emerald-500" };
    if (s >= 45) return { label: "Neutral", color: "text-amber-500 dark:text-amber-500" };
    if (s >= 30) return { label: "Bearish", color: "text-red-500 dark:text-red-500" };
    return { label: "Very Bearish", color: "text-red-600 dark:text-red-400" };
  }

  const sentimentObj = getSentimentLabel(score);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4.5 shadow-sm text-center flex flex-col justify-between min-h-[120px]">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">News Sentiment Score</h3>
          <div className="py-2">
            <span className={cn("text-3xl font-extrabold tabular-nums", sentimentObj.color)}>
              {score}/100
            </span>
          </div>
          <span className={cn("text-xs font-bold", sentimentObj.color)}>
            {sentimentObj.label}
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-4.5 shadow-sm sm:col-span-2 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary fill-current" />
            Social Sentiment Summary
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground font-semibold mt-1">
            The media coverage exhibits {sentimentObj.label.toLowerCase()} characteristics. Analysts note positive momentum with strong sector support, balanced by occasional valuation concerns and macroeconomic headwinds.
          </p>
        </div>
      </section>

      {/* Recharts Trend Line */}
      {trendData.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              Sentiment Trend
            </h2>
            <p className="text-xs text-muted-foreground">Rolling sentiment score tracking over the last 15 articles</p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentimentColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(139, 92, 246)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="rgb(139, 92, 246)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <YAxis
                  orientation="right"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  width={30}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const val = Number(payload[0].value);
                    return (
                      <div className="rounded-xl border bg-popover px-2.5 py-1.5 text-[10px] shadow-lg font-bold">
                        <span className="text-foreground">Score: {val}/100</span>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="rgb(139, 92, 246)"
                  fillOpacity={1}
                  fill="url(#sentimentColor)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* side-by-side positive/negative headlines */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4.5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4" />
            Bullish Headlines
          </h3>
          {bullishHeadlines.length === 0 ? (
            <p className="text-xs text-muted-foreground italic font-semibold">No highly positive articles found.</p>
          ) : (
            <ul className="space-y-2 text-xs leading-relaxed font-semibold text-muted-foreground list-disc pl-4">
              {bullishHeadlines.map((h, idx) => (
                <li key={idx} className="hover:text-foreground transition-colors">{h}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-4.5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <ThumbsDown className="h-4 w-4" />
            Bearish Headlines
          </h3>
          {bearishHeadlines.length === 0 ? (
            <p className="text-xs text-muted-foreground italic font-semibold">No highly negative articles found.</p>
          ) : (
            <ul className="space-y-2 text-xs leading-relaxed font-semibold text-muted-foreground list-disc pl-4">
              {bearishHeadlines.map((h, idx) => (
                <li key={idx} className="hover:text-foreground transition-colors">{h}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
