export function buildDashboardSnapshot<TIndex, TWatchlist extends { symbol: string }, TArticle extends { headline: string }>({
  indexes,
  watchlistRows,
  articles,
}: {
  indexes: TIndex[];
  watchlistRows: TWatchlist[];
  articles: TArticle[];
}) {
  return {
    indexSymbols: indexes.map((item) =>
      typeof item === "object" && item !== null && "symbol" in item
        ? String(item.symbol)
        : ""
    ),
    watchlistPreview: watchlistRows.slice(0, 3),
    newsPreview: articles.slice(0, 4),
  };
}
