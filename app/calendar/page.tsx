import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  buildEarningsRows,
  type EarningsRow,
  getMarketHolidays,
  getNextMarketEvents,
} from "@/lib/calendar";
import { getEarningsCalendar } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";
import { CalendarDashboard } from "@/components/calendar-dashboard";

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

  // Retrieve user watchlist symbols for client-side filtering option
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let watchlistSymbols: string[] = [];
  if (user) {
    const { data: wData } = await supabase
      .from("watchlist")
      .select("symbol")
      .eq("user_id", user.id);
    watchlistSymbols = (wData ?? []).map((w) => w.symbol);
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
              Track US market holidays, earnings announcements, and dividend ex-dates in one planning view.
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
          <p className="mt-2 text-lg font-semibold truncate">
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

      {earningsError && (
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold bg-red-500/10 p-2 rounded-lg border border-red-500/20 max-w-md">
          Warning: {earningsError}
        </p>
      )}

      <CalendarDashboard
        earnings={earnings}
        upcomingHolidays={upcomingHolidays}
        watchlistSymbols={watchlistSymbols}
      />
    </div>
  );
}
