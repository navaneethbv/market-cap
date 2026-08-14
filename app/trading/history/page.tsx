import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchAllPaperTrades } from "@/app/trading/data";
import { EquityChart, type EquityPoint } from "@/components/equity-chart";
import { Button } from "@/components/ui/button";
import { TradeLogTable } from "@/components/trade-log-table";
import { formatPrice } from "@/lib/format";
import {
  buildPaperPortfolio,
  DEFAULT_STARTING_CASH,
} from "@/lib/paper-trading";
import { createClient } from "@/lib/supabase/server";

import { ExportTradesButton } from "@/components/export-trades-button";

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
          <div className="flex items-center gap-2">
            <ExportTradesButton trades={tradesNewestFirst} />
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/trading">Back to trading</Link>
            </Button>
          </div>
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
              Updated after trades when live quotes are available.
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
          <TradeLogTable trades={tradesNewestFirst} />
        )}
      </section>
    </div>
  );
}
