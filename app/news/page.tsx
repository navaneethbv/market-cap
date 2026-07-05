import Link from "next/link";
import { NewsList } from "@/components/news-list";
import { Button } from "@/components/ui/button";
import { getMarketNews } from "@/lib/market/finnhub";
import type { NewsArticle } from "@/lib/market/types";
import {
  filterNewsBySentiment,
  getSentimentCounts,
  normalizeNewsSentiment,
  type NewsSentiment,
} from "@/lib/news-sentiment";

type NewsPageProps = {
  searchParams: Promise<{ sentiment?: string | string[] }>;
};

const FILTERS: { value: NewsSentiment; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bullish", label: "Bullish" },
  { value: "bearish", label: "Bearish" },
  { value: "neutral", label: "Neutral" },
];

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const activeSentiment = normalizeNewsSentiment(params.sentiment);
  let articles: NewsArticle[] = [];

  try {
    articles = await getMarketNews();
  } catch (err) {
    console.error("market news failed:", err);
  }

  const counts = getSentimentCounts(articles);
  const filteredArticles = filterNewsBySentiment(articles, activeSentiment);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market news</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              The latest market-moving stories from Finnhub&apos;s general news
              feed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <Button
                key={filter.value}
                asChild
                variant={activeSentiment === filter.value ? "default" : "outline"}
                className="rounded-full"
              >
                <Link
                  href={
                    filter.value === "all"
                      ? "/news"
                      : `/news?sentiment=${filter.value}`
                  }
                >
                  {filter.label}
                  <span className="tabular-nums">
                    {counts[filter.value]}
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <NewsList
        articles={filteredArticles}
        emptyMessage="No stories match this sentiment filter."
      />
    </div>
  );
}
