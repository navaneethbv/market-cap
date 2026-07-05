import Link from "next/link";
import { redirect } from "next/navigation";
import { PieChart } from "lucide-react";
import { ChangeChip } from "@/components/change-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildAllocationRows,
  calculateAllocationSummary,
} from "@/lib/allocation";
import { formatNumber, formatPrice } from "@/lib/format";
import { getQuote } from "@/lib/market/finnhub";
import { buildHoldingRows, type Holding } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";

export default async function PortfolioAllocationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio/allocation");
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
  const holdingRows = buildHoldingRows(holdings, quoteResults);
  const allocationRows = buildAllocationRows(holdingRows);
  const summary = calculateAllocationSummary(holdingRows);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Allocation</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Portfolio allocation
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              See position weights, concentration, and the largest positions in
              your portfolio.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/portfolio">Back to portfolio</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Market value
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatPrice(summary.totalMarketValue)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Largest position
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary.largest?.symbol ?? "-"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNumber(summary.largestWeightPercent, 2)}%
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Concentration
          </p>
          <p className="mt-2 text-lg font-semibold">
            {summary.concentrationLabel}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Quoted positions
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary.pricedPositionCount}/{summary.positionCount}
          </p>
        </div>
      </section>

      {allocationRows.length === 0 ? (
        <section className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <PieChart className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">No holdings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Add holdings before reviewing allocation.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link href="/portfolio">Add holdings</Link>
          </Button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Market value</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Shares
                </TableHead>
                <TableHead className="text-right">Daily move</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocationRows.map((row) => (
                <TableRow key={row.id}>
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
                  <TableCell className="text-right font-semibold tabular-nums">
                    {row.weightPercent === null
                      ? "-"
                      : `${formatNumber(row.weightPercent, 2)}%`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.marketValue === null ? "-" : formatPrice(row.marketValue)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatNumber(row.shares, 4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.quote ? (
                      <ChangeChip value={row.quote.changePercent} />
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
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
