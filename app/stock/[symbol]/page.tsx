/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ChangeChip } from "@/components/change-chip";
import { NewsList } from "@/components/news-list";
import { StockChart } from "@/components/stock-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import {
  getCompanyNews,
  getKeyMetrics,
  getProfile,
  getQuote,
} from "@/lib/market/finnhub";
import type {
  CompanyProfile,
  KeyMetrics,
  NewsArticle,
} from "@/lib/market/types";
import { buildStockStats } from "@/lib/stock-display";

const EMPTY_METRICS: KeyMetrics = {
  high52: null,
  low52: null,
  peRatio: null,
  beta: null,
  dividendYield: null,
  epsTTM: null,
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

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = await params;
  const symbol = decodeURIComponent(rawSymbol).trim().toUpperCase();

  if (!isValidSymbol(symbol)) {
    notFound();
  }

  const [profileResult, quoteResult, metricsResult, newsResult] =
    await Promise.allSettled([
      getProfile(symbol),
      getQuote(symbol),
      getKeyMetrics(symbol),
      getCompanyNews(symbol),
    ]);

  if (quoteResult.status !== "fulfilled") {
    notFound();
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
                  className="mt-2 h-auto p-0"
                  asChild
                >
                  <Link href={profile.weburl} target="_blank" rel="noreferrer">
                    Company site
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="lg:text-right">
            <div className="text-4xl font-bold tabular-nums tracking-tight">
              {formatPrice(quote.price)}
            </div>
            <div className="mt-2 flex items-center gap-2 lg:justify-end">
              <ChangeChip value={quote.changePercent} />
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                {quote.change >= 0 ? "+" : ""}
                {formatPrice(quote.change)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <StockChart symbol={symbol} />

      <section className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Key stats</h2>
            <p className="text-sm text-muted-foreground">
              Latest quote and company metrics
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card p-3">
                <dt className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Latest news</h2>
              <p className="text-sm text-muted-foreground">
                Recent stories mentioning {symbol}
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link href="/news">Market news</Link>
            </Button>
          </div>
          <NewsList
            articles={news.slice(0, 6)}
            emptyMessage={`No recent ${symbol} stories available.`}
          />
        </div>
      </section>
    </div>
  );
}
