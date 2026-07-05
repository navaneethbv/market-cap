import Link from "next/link";
import { ArrowRightLeft, Save, Trophy } from "lucide-react";
import { createSavedComparison } from "@/app/compare/saved/actions";
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
  buildComparisonRows,
  calculateComparisonSummary,
  normalizeComparisonSymbols,
} from "@/lib/compare";
import { formatNumber, formatPrice } from "@/lib/format";
import { getQuote } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";

type ComparePageProps = {
  searchParams: Promise<{ symbols?: string | string[] }>;
};

function symbolsParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(",") : value;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const symbols = normalizeComparisonSymbols(symbolsParam(params.symbols));
  const quoteResults = await Promise.allSettled(
    symbols.map((symbol) => getQuote(symbol))
  );
  const rows = buildComparisonRows(symbols, quoteResults);
  const summary = calculateComparisonSummary(rows);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Compare</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Stock comparison
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Compare up to five symbols by current price, daily move, and day
              range.
            </p>
          </div>
          <form action="/compare" className="flex w-full gap-2 sm:max-w-md">
            <input
              name="symbols"
              defaultValue={symbols.join(",")}
              aria-label="Symbols to compare"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 min-w-0 flex-1 rounded-full border px-4 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              placeholder="AAPL,MSFT,NVDA"
            />
            <Button type="submit" className="rounded-full">
              Compare
            </Button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Reusable comparison</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save this symbol group or open your saved comparison sets.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {user ? (
              symbols.length >= 2 && (
                <form action={createSavedComparison} className="flex gap-2">
                  <input
                    type="hidden"
                    name="symbols"
                    value={symbols.join(",")}
                  />
                  <input
                    name="name"
                    required
                    maxLength={60}
                    aria-label="Saved comparison name"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 min-w-0 rounded-full border px-4 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    placeholder="AI leaders"
                  />
                  <Button type="submit" className="rounded-full">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </form>
              )
            ) : (
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/login?next=/compare">Sign in to save</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/compare/matrix">Matrix view</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/compare/saved">Saved sets</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Best move</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-2xl font-bold tabular-nums">
              {summary.best?.symbol ?? "-"}
            </p>
            {summary.best && (
              <ChangeChip value={summary.best.changePercent} />
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Weakest move
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-2xl font-bold tabular-nums">
              {summary.worst?.symbol ?? "-"}
            </p>
            {summary.worst && (
              <ChangeChip value={summary.worst.changePercent} />
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Average move
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatNumber(summary.averageChangePercent, 2)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.pricedCount} of {summary.symbolCount} quoted
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Open
              </TableHead>
              <TableHead className="hidden text-right md:table-cell">
                Prev close
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Day range
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.symbol}>
                <TableCell className="w-16">
                  {row.rank === 1 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <Trophy className="h-4 w-4" /> 1
                    </span>
                  ) : (
                    (row.rank ?? "-")
                  )}
                </TableCell>
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
                  {row.quote ? formatPrice(row.quote.price) : "-"}
                </TableCell>
                <TableCell>
                  {row.quote ? (
                    <ChangeChip value={row.quote.changePercent} />
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">
                  {row.quote ? formatPrice(row.quote.open) : "-"}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">
                  {row.quote ? formatPrice(row.quote.prevClose) : "-"}
                </TableCell>
                <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground lg:table-cell">
                  {row.quote
                    ? `${formatPrice(row.quote.low)} / ${formatPrice(row.quote.high)}`
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <div className="flex justify-end">
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/compare?symbols=SPY,QQQ,DIA">
            <ArrowRightLeft className="h-4 w-4" />
            Compare indexes
          </Link>
        </Button>
      </div>
    </div>
  );
}
