import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  Star,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChangeChip } from "@/components/change-chip";
import { DCFCalculator } from "@/components/dcf-calculator";
import { AddHoldingDialog } from "@/components/holding-dialogs";
import { StockChart } from "@/components/stock-chart";
import { EarningsHistory } from "@/components/earnings-history";
import { toggleWatchlistItem } from "@/app/watchlist/actions";
import {
  getCompanyNews,
  getKeyMetrics,
  getProfile,
  getQuote,
  getEarningsSurprises,
} from "@/lib/market/finnhub";
import type { KeyMetrics, NewsArticle, CompanyProfile } from "@/lib/market/types";
import { buildStockStats } from "@/lib/stock-display";
import { createClient } from "@/lib/supabase/server";

const EMPTY_METRICS: KeyMetrics = {
  peRatio: null,
  epsTTM: null,
  dividendYield: null,
  high52: null,
  low52: null,
  beta: null,
};

function emptyProfile(symbol: string): CompanyProfile {
  return {
    symbol,
    name: symbol,
    exchange: "",
    industry: "",
    logo: "",
    weburl: "",
    ipo: "",
    marketCap: 0,
    sharesOutstanding: 0,
  };
}

function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9.^-]{1,12}$/.test(symbol);
}

async function loadStockData(symbol: string) {
  const [profileResult, quoteResult, metricsResult, newsResult, earningsResult] =
    await Promise.allSettled([
      getProfile(symbol),
      getQuote(symbol),
      getKeyMetrics(symbol),
      getCompanyNews(symbol),
      getEarningsSurprises(symbol),
    ]);

  if (quoteResult.status !== "fulfilled") {
    return null;
  }

  const quote = quoteResult.value;
  const profile =
    profileResult.status === "fulfilled"
      ? profileResult.value
      : emptyProfile(symbol);
  const metrics =
    metricsResult.status === "fulfilled" ? metricsResult.value : EMPTY_METRICS;
  const news: NewsArticle[] =
    newsResult.status === "fulfilled" ? newsResult.value : [];
  const earnings =
    earningsResult.status === "fulfilled" ? earningsResult.value : [];

  return { quote, profile, metrics, news, earnings };
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getWatchlistItem(
  supabase: SupabaseServerClient,
  userId: string | undefined,
  symbol: string
) {
  if (!userId) return null;
  const { data } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .maybeSingle();
  return data;
}

export default async function StockPage({
  params,
}: Readonly<{
  params: Promise<{ symbol: string }>;
}>) {
  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol).trim().toUpperCase();

  if (!isValidSymbol(symbol)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await loadStockData(symbol);
  if (!data) {
    notFound();
  }

  const { quote, profile, metrics, news, earnings } = data;
  const watchlistItem = await getWatchlistItem(supabase, user?.id, symbol);
  const stats = buildStockStats({ quote, profile, metrics });
  const title = profile.name || symbol;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background">
              {profile.logo ? (
                <img
                  src={profile.logo}
                  alt=""
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-lg font-bold">{symbol.slice(0, 2)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                  {title}
                </h1>
                {profile.industry && (
                  <Badge variant="secondary" className="rounded-full">
                    {profile.industry}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {symbol}
                {profile.exchange ? ` - ${profile.exchange}` : ""}
              </p>
              {profile.weburl && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  asChild
                >
                  <a
                    href={profile.weburl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1"
                  >
                    <span>Website</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-bold tracking-tight">
                ${quote.price.toFixed(2)}
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-xs">
                <ChangeChip value={quote.changePercent} />
                <span className="text-muted-foreground">
                  {quote.change >= 0 ? "+" : ""}
                  {quote.change.toFixed(2)} today
                </span>
              </div>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <form action={toggleWatchlistItem}>
                  <input type="hidden" name="symbol" value={symbol} />
                  <input
                    type="hidden"
                    name="next"
                    value={`/stock/${symbol}`}
                  />
                  <Button
                    type="submit"
                    variant={watchlistItem ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-full"
                  >
                    <Star
                      className={watchlistItem ? "fill-current" : undefined}
                    />
                    {watchlistItem ? "Watching" : "Watch"}
                  </Button>
                </form>
                <AddHoldingDialog
                  defaultSymbol={symbol}
                  defaultAvgCost={Number(quote.price.toFixed(2))}
                  next="/portfolio"
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                    >
                      <Briefcase className="h-4 w-4" />
                      Add to portfolio
                    </Button>
                  }
                />
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                asChild
              >
                <Link href={`/login?next=/stock/${symbol}`}>
                  <Star />
                  Watch
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <StockChart symbol={symbol} />

      <EarningsHistory surprises={earnings} symbol={symbol} />

      <DCFCalculator
        currentPrice={quote.price}
        initialEps={metrics.epsTTM || null}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border bg-card p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {news.length > 0 && (
        <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Recent news</h2>
              <p className="text-xs text-muted-foreground">
                Headlines and coverage for {symbol}
              </p>
            </div>
          </div>

          <div className="mt-5 divide-y">
            {news.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {item.source}
                  </span>
                  <span>-</span>
                  <time dateTime={new Date(item.datetime * 1000).toISOString()}>
                    {new Date(item.datetime * 1000).toLocaleDateString()}
                  </time>
                </div>
                <h3 className="font-semibold leading-snug tracking-tight hover:underline">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-start gap-1"
                  >
                    <span>{item.headline}</span>
                    <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                </h3>
                {item.summary && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.summary}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
