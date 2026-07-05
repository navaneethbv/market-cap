import Link from "next/link";
import { ArrowDown, ArrowUp, Activity } from "lucide-react";
import { ChangeChip } from "@/components/change-chip";
import { Badge } from "@/components/ui/badge";
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
  buildMoverRows,
  calculateMoversSummary,
  getMoverBasket,
  getTopMovers,
  MOVER_BASKETS,
} from "@/lib/movers";

type MoversPageProps = {
  searchParams: Promise<{ basket?: string | string[] }>;
};

function basketParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function MoverCard({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: ReturnType<typeof getTopMovers>["gainers"];
  icon: "up" | "down";
}) {
  const Icon = icon === "up" ? ArrowUp : ArrowDown;
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <Link
            key={row.symbol}
            href={`/stock/${row.symbol}`}
            className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"
          >
            <div>
              <p className="font-semibold">{row.symbol}</p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(row.quote.price)}
              </p>
            </div>
            <ChangeChip value={row.quote.changePercent} />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function MoversPage({ searchParams }: MoversPageProps) {
  const params = await searchParams;
  const basket = getMoverBasket(basketParam(params.basket));
  const quoteResults = await Promise.allSettled(
    basket.symbols.map((symbol) => getQuote(symbol))
  );
  const rows = buildMoverRows(basket.symbols, quoteResults);
  const summary = calculateMoversSummary(rows);
  const { gainers, losers } = getTopMovers(rows, 3);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Movers</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Market movers
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Scan curated baskets for the strongest and weakest daily moves.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOVER_BASKETS.map((option) => (
              <Button
                key={option.id}
                asChild
                variant={option.id === basket.id ? "default" : "outline"}
                className="rounded-full"
              >
                <Link href={`/movers?basket=${option.id}`}>{option.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Basket</p>
          <p className="mt-2 text-2xl font-bold">{basket.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {basket.description}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Average move
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {formatNumber(summary.averageChangePercent, 2)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.quotedCount} of {summary.symbolCount} quoted
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Advancers
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary.advancingCount}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Decliners
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary.decliningCount}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <MoverCard title="Top gainers" rows={gainers} icon="up" />
        <MoverCard title="Top losers" rows={losers} icon="down" />
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {row.direction === "unavailable"
                      ? "No quote"
                      : row.direction}
                  </Badge>
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
            <Activity className="h-4 w-4" />
            Compare indexes
          </Link>
        </Button>
      </div>
    </div>
  );
}
