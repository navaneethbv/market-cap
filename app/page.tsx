import Link from "next/link";
import {
  ArrowRight,
  ArrowRightLeft,
  Briefcase,
  Newspaper,
  Star,
} from "lucide-react";
import { ChangeChip } from "@/components/change-chip";
import { NewsList } from "@/components/news-list";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import { getMarketNews, getQuote } from "@/lib/market/finnhub";
import type { Quote } from "@/lib/market/types";
import { createClient } from "@/lib/supabase/server";
import { buildWatchlistRows, type WatchlistItem } from "@/lib/watchlist";

const INDEX_SYMBOLS = ["SPY", "QQQ", "DIA"];

async function getWatchlistRows(userId: string | null) {
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("id,symbol,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    return [];
  }

  const items = (data ?? []) as WatchlistItem[];
  const quoteResults = await Promise.allSettled(
    items.map((item) => getQuote(item.symbol))
  );
  return buildWatchlistRows(items, quoteResults);
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [indexResults, watchlistRows, newsResult] = await Promise.all([
    Promise.allSettled(INDEX_SYMBOLS.map((symbol) => getQuote(symbol))),
    getWatchlistRows(user?.id ?? null),
    getMarketNews().catch(() => []),
  ]);

  const indexes = indexResults
    .filter((result): result is PromiseFulfilledResult<Quote> => {
      return result.status === "fulfilled";
    })
    .map((result) => result.value);
  const snapshot = buildDashboardSnapshot({
    indexes,
    watchlistRows,
    articles: newsResult,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">MarketCap</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Market overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Index pulse, saved symbols, and market news in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/compare">
                <ArrowRightLeft className="h-4 w-4" />
                Compare
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/watchlist">
                <Star className="h-4 w-4" />
                Watchlist
              </Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/portfolio">
                <Briefcase className="h-4 w-4" />
                Portfolio
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {indexes.map((quote) => (
          <Link
            key={quote.symbol}
            href={`/stock/${quote.symbol}`}
            className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{quote.symbol}</p>
                <p className="text-xs text-muted-foreground">
                  {quote.symbol === "SPY"
                    ? "S&P 500"
                    : quote.symbol === "QQQ"
                      ? "Nasdaq 100"
                      : "Dow 30"}
                </p>
              </div>
              <ChangeChip value={quote.changePercent} />
            </div>
            <p className="mt-4 text-2xl font-bold tabular-nums">
              {formatPrice(quote.price)}
            </p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Watchlist</h2>
              <p className="text-sm text-muted-foreground">
                {user ? "Your latest saved symbols" : "Log in to save symbols"}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/watchlist">
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {snapshot.watchlistPreview.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              Search for a stock and tap Watch to build this list.
            </div>
          ) : (
            <div className="divide-y">
              {snapshot.watchlistPreview.map((row) => (
                <Link
                  key={row.symbol}
                  href={`/stock/${row.symbol}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-semibold">{row.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.quote ? formatPrice(row.quote.price) : row.error}
                    </p>
                  </div>
                  {row.quote && <ChangeChip value={row.quote.changePercent} />}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Market news</h2>
              <p className="text-sm text-muted-foreground">
                Latest general market stories
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/news">
                <Newspaper className="h-3.5 w-3.5" />
                News
              </Link>
            </Button>
          </div>
          <NewsList
            articles={snapshot.newsPreview}
            emptyMessage="No market news available right now."
          />
        </div>
      </section>
    </div>
  );
}
