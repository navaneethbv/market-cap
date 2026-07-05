"use client";

import { useState } from "react";
import Link from "next/link";
import { Newspaper, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsList } from "@/components/news-list";
import { SentimentPanel } from "@/components/sentiment-panel";
import type { NewsArticle } from "@/lib/market/types";

interface NewsTabsProps {
  symbol: string;
  news: NewsArticle[];
}

export function NewsTabs({ symbol, news }: NewsTabsProps) {
  const [activeTab, setActiveTab] = useState<"news" | "sentiment">("news");

  return (
    <div className="space-y-4">
      {/* Tab Selectors */}
      <div className="flex items-center justify-between border-b pb-1.5 flex-wrap gap-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("news")}
            className={`flex items-center gap-1.5 pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "news"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Newspaper className="h-4 w-4" />
            Latest News
          </button>
          <button
            onClick={() => setActiveTab("sentiment")}
            className={`flex items-center gap-1.5 pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "sentiment"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smile className="h-4 w-4" />
            Sentiment Analytics
          </button>
        </div>

        {activeTab === "news" && (
          <Button variant="outline" size="sm" className="rounded-full h-8" asChild>
            <Link href="/news">Market news</Link>
          </Button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === "news" ? (
        <NewsList
          articles={news.slice(0, 6)}
          emptyMessage={`No recent ${symbol} stories available.`}
        />
      ) : (
        <SentimentPanel news={news} />
      )}
    </div>
  );
}
