import Link from "next/link";
import { redirect } from "next/navigation";
import { CandlestickChart } from "lucide-react";
import { placePaperTrade } from "@/app/trading/actions";
import { fetchAllPaperTrades } from "@/app/trading/data";
import { ChangeChip } from "@/components/change-chip";
import { ResetAccountDialog } from "@/components/reset-account-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice } from "@/lib/format";
import { getQuote } from "@/lib/market/finnhub";
import {
  buildPaperPortfolio,
  buildPaperPositionRows,
  buildPaperSummary,
  DEFAULT_STARTING_CASH,
} from "@/lib/paper-trading";
import { createClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/market/types";

const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;

function pnlTone(value: number) {
  return value >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

type TradingPageProps = {
  searchParams: Promise<{ symbol?: string | string[] }>;
};

export default async function TradingPage({ searchParams }: TradingPageProps) {
  const params = await searchParams;
  const rawSymbol = Array.isArray(params.symbol)
    ? params.symbol[0]
    : params.symbol;
  const prefillSymbol = (rawSymbol ?? "").trim().toUpperCase();
  const ticketSymbol = SYMBOL_PATTERN.test(prefillSymbol) ? prefillSymbol : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trading");
  }

  const [{ data: account, error: accountError }, trades] = await Promise.all([
    supabase
      .from("paper_accounts")
      .select("id,starting_cash")
      .eq("user_id", user.id)
      .maybeSingle(),
    fetchAllPaperTrades(supabase, user.id),
  ]);

  if (accountError) {
    throw new Error(accountError.message);
  }

  const startingCash = account
    ? Number(account.starting_cash)
    : DEFAULT_STARTING_CASH;
  const portfolio = buildPaperPortfolio(trades);
  const ticketQuotePromise: Promise<Quote | null> = ticketSymbol
    ? getQuote(ticketSymbol).catch(() => null)
    : Promise.resolve(null);
  const quoteResults = await Promise.allSettled(
    portfolio.positions.map((position) => getQuote(position.symbol))
  );
  const positionRows = buildPaperPositionRows(portfolio.positions, quoteResults);
  const summary = buildPaperSummary({
    startingCash,
    portfolio,
    positionRows,
  });

  const ticketQuote = await ticketQuotePromise;

  const hasQuoteFailures = positionRows.some((row) => row.error !== null);

  // Record today's equity so the history page can chart it. Best effort:
  // a failed snapshot must not break the page.
  // Skip when any quote failed so a cost-basis approximation never
  // overwrites an accurate snapshot for the same day
  if (account && trades.length > 0 && !hasQuoteFailures) {
    const today = new Date().toISOString().slice(0, 10);
    const { error: snapshotError } = await supabase
      .from("paper_equity_snapshots")
      .upsert(
        {
          user_id: user.id,
          snapshot_date: today,
          equity: Math.max(0, summary.equity),
        },
        { onConflict: "user_id,snapshot_date" }
      );
    if (snapshotError) {
      console.error("equity snapshot failed:", snapshotError.message);
    }
  }

  const recentTrades = [...trades].reverse().slice(0, 10);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Paper trading</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Practice trading
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Trade US stocks with virtual cash at real market prices. Zero
              risk, live quotes, honest P&L.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/trading/history">History</Link>
            </Button>
            {trades.length > 0 && (
              <ResetAccountDialog />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Equity</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(summary.equity)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Cash</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(summary.cash)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Unrealized P&L
          </p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${pnlTone(
              summary.unrealizedPnl
            )}`}
          >
            {summary.unrealizedPnl >= 0 ? "+" : ""}
            {formatPrice(summary.unrealizedPnl)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Total return
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`text-2xl font-bold tabular-nums ${pnlTone(
                summary.totalReturn
              )}`}
            >
              {summary.totalReturn >= 0 ? "+" : ""}
              {formatPrice(summary.totalReturn)}
            </span>
            <ChangeChip value={summary.totalReturnPercent} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Trade ticket</h2>
          <p className="text-sm text-muted-foreground">
            Market orders fill instantly at the latest quote.
            {ticketQuote &&
              ` ${ticketQuote.symbol} is at ${formatPrice(ticketQuote.price)}.`}
          </p>
        </div>
        <form
          action={placePaperTrade}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="grid gap-1.5">
            <label htmlFor="trade-symbol" className="text-xs font-medium">
              Symbol
            </label>
            <input
              id="trade-symbol"
              name="symbol"
              required
              maxLength={12}
              defaultValue={ticketSymbol}
              placeholder="AAPL"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-32 rounded-full border px-4 text-sm uppercase shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="trade-shares" className="text-xs font-medium">
              Shares
            </label>
            <input
              id="trade-shares"
              name="shares"
              type="number"
              min="1"
              step="1"
              required
              placeholder="10"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-28 rounded-full border px-4 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              name="side"
              value="buy"
              className="rounded-full"
            >
              Buy
            </Button>
            <Button
              type="submit"
              name="side"
              value="sell"
              variant="outline"
              className="rounded-full"
            >
              Sell
            </Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">Positions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open positions valued at the latest quote.
          </p>
        </div>
        {positionRows.length === 0 ? (
          <div className="p-8 text-center">
            <CandlestickChart className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold">No positions yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Use the trade ticket above to buy your first stock with virtual
              cash.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Value
                </TableHead>
                <TableHead className="text-right">Unrealized P&L</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {positionRows.map((row) => (
                <TableRow key={row.symbol}>
                  <TableCell>
                    <Link
                      href={`/stock/${row.symbol}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {row.symbol}
                    </Link>
                    {row.error && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.shares, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(row.avgCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.quote ? formatPrice(row.quote.price) : "-"}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {row.marketValue === null
                      ? "-"
                      : formatPrice(row.marketValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.unrealizedPnl === null ||
                    row.unrealizedPnlPercent === null ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-sm font-semibold tabular-nums ${pnlTone(
                            row.unrealizedPnl
                          )}`}
                        >
                          {row.unrealizedPnl >= 0 ? "+" : ""}
                          {formatPrice(row.unrealizedPnl)}
                        </span>
                        <ChangeChip value={row.unrealizedPnlPercent} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <form action={placePaperTrade} className="flex justify-end">
                      <input type="hidden" name="symbol" value={row.symbol} />
                      <input type="hidden" name="shares" value={row.shares} />
                      <Button
                        type="submit"
                        name="side"
                        value="sell"
                        variant="ghost"
                        size="sm"
                        aria-label={`Sell all ${row.symbol}`}
                      >
                        Sell all
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {recentTrades.length > 0 && (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-end justify-between border-b p-5">
            <div>
              <h2 className="text-base font-semibold">Recent trades</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Last {recentTrades.length} fills.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/trading/history">Full history</Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Total
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Executed
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    <Link
                      href={`/stock/${trade.symbol}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {trade.symbol}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{trade.side}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(trade.shares, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(trade.price)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {formatPrice(trade.shares * trade.price)}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
                    {new Date(trade.executed_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
