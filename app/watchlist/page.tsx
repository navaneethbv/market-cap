import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toggleWatchlistItem } from "@/app/watchlist/actions";
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
import { formatPrice } from "@/lib/format";
import { getQuote } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";
import { buildWatchlistRows, type WatchlistItem } from "@/lib/watchlist";
import { WatchlistSparkline } from "@/components/watchlist-sparkline";

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/watchlist");
  }

  const { data, error } = await supabase
    .from("watchlist_items")
    .select("id,symbol,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []) as WatchlistItem[];
  const quoteResults = await Promise.allSettled(
    items.map((item) => getQuote(item.symbol))
  );
  const rows = buildWatchlistRows(items, quoteResults);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stocks you are tracking right now.
        </p>
      </div>

      {rows.length === 0 ? (
        <section className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h2 className="text-base font-semibold">No symbols yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Search for a stock, open its detail page, and add it here.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link href="/stock/AAPL">Open Apple</Link>
          </Button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="w-28">7D Trend</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Day range
                </TableHead>
                <TableHead className="w-12" />
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
                  <TableCell>
                    <WatchlistSparkline symbol={row.symbol} />
                  </TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
                    {row.quote
                      ? `${formatPrice(row.quote.low)} / ${formatPrice(row.quote.high)}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <form action={toggleWatchlistItem}>
                      <input type="hidden" name="symbol" value={row.symbol} />
                      <input type="hidden" name="next" value="/watchlist" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${row.symbol} from watchlist`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
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
