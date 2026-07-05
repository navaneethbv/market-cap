import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteHolding } from "@/app/portfolio/actions";
import { ChangeChip } from "@/components/change-chip";
import { AddHoldingDialog, EditHoldingDialog } from "@/components/holding-dialogs";
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
  buildHoldingRows,
  calculatePortfolioSummary,
  type Holding,
} from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";

function summaryTone(value: number) {
  return value >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio");
  }

  const { data, error } = await supabase
    .from("holdings")
    .select("id,symbol,shares,avg_cost,purchased_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const holdings = (data ?? []).map((holding) => ({
    ...holding,
    shares: Number(holding.shares),
    avg_cost: Number(holding.avg_cost),
  })) as Holding[];
  const quoteResults = await Promise.allSettled(
    holdings.map((holding) => getQuote(holding.symbol))
  );
  const rows = buildHoldingRows(holdings, quoteResults);
  const summary = calculatePortfolioSummary(rows);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Positions, cost basis, and current market value.
          </p>
        </div>
        <AddHoldingDialog />
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Market value
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(summary.marketValue)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Cost basis
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(summary.costBasis)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">P/L</p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${summaryTone(
              summary.profitLoss
            )}`}
          >
            {summary.profitLoss >= 0 ? "+" : ""}
            {formatPrice(summary.profitLoss)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Return</p>
          <div className="mt-2">
            <ChangeChip value={summary.profitLossPercent} />
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-base font-semibold">No holdings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Add your first stock position to start tracking performance.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
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
                <TableHead className="text-right">P/L</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/stock/${row.symbol}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {row.symbol}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bought {row.purchasedAt}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.shares, 4)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(row.avgCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.quote ? formatPrice(row.quote.price) : "-"}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {row.marketValue === null ? "-" : formatPrice(row.marketValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.profitLoss === null ||
                    row.profitLossPercent === null ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-sm font-semibold tabular-nums ${summaryTone(
                            row.profitLoss
                          )}`}
                        >
                          {row.profitLoss >= 0 ? "+" : ""}
                          {formatPrice(row.profitLoss)}
                        </span>
                        <ChangeChip value={row.profitLossPercent} />
                      </div>
                    )}
                    {row.error && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <EditHoldingDialog holding={row} />
                      <form action={deleteHolding}>
                        <input type="hidden" name="id" value={row.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${row.symbol}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
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
