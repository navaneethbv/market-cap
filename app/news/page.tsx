import { NewsList } from "@/components/news-list";
import { getMarketNews } from "@/lib/market/finnhub";
import type { NewsArticle } from "@/lib/market/types";

export default async function NewsPage() {
  let articles: NewsArticle[] = [];

  try {
    articles = await getMarketNews();
  } catch (err) {
    console.error("market news failed:", err);
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Market news</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          The latest market-moving stories from Finnhub&apos;s general news feed.
        </p>
      </section>

      <NewsList articles={articles} />
    </div>
  );
}
