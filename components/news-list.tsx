/* eslint-disable @next/next/no-img-element */
import { ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { NewsArticle } from "@/lib/market/types";

export function NewsList({
  articles,
  emptyMessage = "No news available right now.",
}: {
  articles: NewsArticle[];
  emptyMessage?: string;
}) {
  const visibleArticles = articles.filter((article) => {
    return article.headline && article.url;
  });

  if (visibleArticles.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-2xl border bg-card">
      {visibleArticles.map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="group grid gap-4 p-4 transition-colors hover:bg-muted/40 sm:grid-cols-[112px_1fr]"
        >
          <div className="relative h-28 overflow-hidden rounded-xl bg-muted sm:h-20">
            {article.image ? (
              <img
                src={article.image}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                News
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
              <span>{article.source || "Market news"}</span>
              <span aria-hidden="true">/</span>
              <span>{timeAgo(article.datetime)}</span>
            </div>
            <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-foreground group-hover:text-primary">
              {article.headline}
            </h3>
            {article.summary && (
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {article.summary}
              </p>
            )}
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Read story
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
