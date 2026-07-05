export function buildDashboardSnapshot<
  TIndex extends { symbol: string },
  TWatchlist extends { symbol: string },
  TArticle extends { headline: string },
>({
  indexes,
  watchlistRows,
  articles,
}: {
  indexes: TIndex[];
  watchlistRows: TWatchlist[];
  articles: TArticle[];
}) {
  return {
    indexSymbols: indexes.map((item) => item.symbol),
    watchlistPreview: watchlistRows.slice(0, 3),
    newsPreview: articles.slice(0, 4),
  };
}
