import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchAllPaperTrades } from "@/app/trading/data";
import { EquityChart, type EquityPoint } from "@/components/equity-chart";
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
import {
  buildPaperPortfolio,
  DEFAULT_STARTING_CASH,
} from "@/lib/paper-trading";
import { createClient } from "@/lib/supabase/server";

function pnlTone(value: number) {
  return value >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

export default async function TradingHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trading/history");
  }

  const [
    { data: account, error: accountError },
    trades,
    { data: snapshotData, error: snapshotsError },
  ] =
    await Promise.all([
      supabase
        .from("paper_accounts")
        .select("id,starting_cash")
        .eq("user_id", user.id)
        .maybeSingle(),
      fetchAllPaperTrades(supabase, user.id),
      supabase
        .from("paper_equity_snapshots")
        .select("snapshot_date,equity")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: true }),
    ]);

  if (snapshotsError) {
    throw new Error(snapshotsError.message);
  }

  if (accountError) {
    throw new Error(accountError.message);
  }

  const startingCash = account
    ? Number(account.starting_cash)
    : DEFAULT_STARTING_CASH;
  const portfolio = buildPaperPortfolio(trades);
  const tradesNewestFirst = [...trades].reverse();
  const points: EquityPoint[] = (snapshotData ?? []).map((row) => ({
    date: String(row.snapshot_date),
    equity: Number(row.equity),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Paper trading</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Trading history
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Equity over time, realized results, and every fill on record.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/trading">Back to trading</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Starting cash
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(startingCash)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Realized P&L
          </p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${pnlTone(
              portfolio.realizedPnl
            )}`}
          >
            {portfolio.realizedPnl >= 0 ? "+" : ""}
            {formatPrice(portfolio.realizedPnl)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Total fills
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {trades.length}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Equity curve</h2>
          <p className="text-sm text-muted-foreground">
            Updated on days you visit the trading page with live quotes
            available.
          </p>
        </div>
        <EquityChart points={points} />
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">Trade log</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every fill, newest first.
          </p>
        </div>
        {tradesNewestFirst.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            No trades yet. Place your first order on the trading page.
          </div>
        ) : (
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
              {tradesNewestFirst.map((trade) => (
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
        )}
      </section>
    </div>
  );
}
