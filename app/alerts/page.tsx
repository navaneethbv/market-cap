import Link from "next/link";
import { redirect } from "next/navigation";
import { BellOff, Pause, Play, Trash2 } from "lucide-react";
import { deleteAlert, toggleAlertActive } from "@/app/alerts/actions";
import { AddAlertDialog, EditAlertDialog } from "@/components/alert-dialogs";
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
import {
  buildAlertRows,
  calculateAlertSummary,
  type AlertRow,
  type AlertStatus,
  type PriceAlert,
} from "@/lib/alerts";
import { formatNumber, formatPrice } from "@/lib/format";
import { getQuote } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<AlertStatus, string> = {
  watching: "Watching",
  triggered: "Triggered",
  paused: "Paused",
  unavailable: "Unavailable",
};

function statusVariant(status: AlertStatus) {
  if (status === "triggered") {
    return "default";
  }
  if (status === "unavailable") {
    return "destructive";
  }
  return "secondary";
}

function ruleLabel(row: AlertRow) {
  return `${row.direction === "above" ? "Above" : "Below"} ${formatPrice(
    row.targetPrice
  )}`;
}

function distanceLabel(row: AlertRow) {
  if (row.distance === null || row.distancePercent === null) {
    return "-";
  }
  if (row.isTriggered) {
    return "Crossed";
  }
  return `${formatPrice(row.distance)} away (${formatNumber(
    row.distancePercent,
    2
  )}%)`;
}

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/alerts");
  }

  const { data, error } = await supabase
    .from("price_alerts")
    .select("id,symbol,direction,target_price,active,triggered_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const alerts = (data ?? []).map((alert) => ({
    ...alert,
    target_price: Number(alert.target_price),
  })) as PriceAlert[];
  const quoteResults = await Promise.allSettled(
    alerts.map((alert) => getQuote(alert.symbol))
  );
  const rows = buildAlertRows(alerts, quoteResults);
  const summary = calculateAlertSummary(rows);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Price alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track target prices against the latest market quote.
          </p>
        </div>
        <AddAlertDialog />
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Active</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary.activeCount}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Triggered now
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary.triggeredCount}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Paused</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {summary.pausedCount}
          </p>
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <BellOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-base font-semibold">No alerts yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Add a target price and MarketCap will show whether the latest quote
            has crossed it.
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
                <TableHead>Rule</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Distance
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28" />
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
                    {row.error && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{ruleLabel(row)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {row.quote ? formatPrice(row.quote.price) : "-"}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground md:table-cell">
                    {distanceLabel(row)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {STATUS_LABELS[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <form action={toggleAlertActive}>
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={String(row.active)}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            row.active
                              ? `Pause ${row.symbol} alert`
                              : `Resume ${row.symbol} alert`
                          }
                        >
                          {row.active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </form>
                      <EditAlertDialog alert={row} />
                      <form action={deleteAlert}>
                        <input type="hidden" name="id" value={row.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${row.symbol} alert`}
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
