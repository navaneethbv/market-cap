import Link from "next/link";
import { CalendarDays } from "lucide-react";
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
  buildEarningsRows,
  type EarningsRow,
  getMarketHolidays,
  getNextMarketEvents,
} from "@/lib/calendar";
import { formatNumber } from "@/lib/format";
import { getEarningsCalendar } from "@/lib/market/finnhub";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function MarketCalendarPage() {
  const todayDate = new Date();
  const today = isoDate(todayDate);
  const to = isoDate(addDays(todayDate, 21));
  const year = todayDate.getUTCFullYear();
  const holidays = getMarketHolidays(year);
  const upcomingHolidays = getNextMarketEvents(today, holidays);
  let earnings: EarningsRow[] = [];
  let earningsError: string | null = null;

  try {
    earnings = buildEarningsRows(await getEarningsCalendar(today, to));
  } catch (err) {
    earningsError =
      err instanceof Error ? err.message : "Earnings calendar unavailable";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">
              Market calendar
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Upcoming market dates
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track US market holidays and upcoming earnings in one planning
              view.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/news">Open news</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Today</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{today}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Next holiday
          </p>
          <p className="mt-2 text-lg font-semibold">
            {upcomingHolidays[0]?.name ?? "-"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {upcomingHolidays[0]?.date ?? "No remaining holidays this year"}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Earnings window
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {earnings.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Through {to}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Market holidays</h2>
          </div>
          <div className="space-y-3">
            {upcomingHolidays.map((holiday) => (
              <div
                key={holiday.date}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{holiday.name}</p>
                  <p className="text-xs text-muted-foreground">{holiday.date}</p>
                </div>
                <Badge variant="outline">Closed</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-base font-semibold">Upcoming earnings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Finnhub calendar events for the next 21 days.
            </p>
          </div>
          {earningsError ? (
            <div className="p-5 text-sm text-muted-foreground">
              {earningsError}
            </div>
          ) : earnings.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              No earnings events available for this window.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead className="text-right">EPS est.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((event) => (
                  <TableRow key={`${event.symbol}-${event.date}`}>
                    <TableCell>
                      <Link
                        href={`/stock/${event.symbol}`}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {event.symbol}
                      </Link>
                    </TableCell>
                    <TableCell>{event.date}</TableCell>
                    <TableCell>{event.session}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {event.epsEstimate === null
                        ? "-"
                        : formatNumber(event.epsEstimate, 2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
