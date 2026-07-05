"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Newspaper, Search, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import type { EarningsRow } from "@/lib/calendar";

interface CalendarDashboardProps {
  earnings: EarningsRow[];
  upcomingHolidays: { name: string; date: string }[];
  watchlistSymbols: string[];
}

export function CalendarDashboard({
  earnings,
  upcomingHolidays,
  watchlistSymbols,
}: CalendarDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWatchlist, setFilterWatchlist] = useState(false);

  const filteredEarnings = earnings.filter((e) => {
    const matchesSearch = e.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWatchlist = !filterWatchlist || watchlistSymbols.includes(e.symbol);
    return matchesSearch && matchesWatchlist;
  });

  return (
    <div className="space-y-6">
      {/* Search and Watchlist Filtering Controls */}
      <section className="rounded-2xl border bg-card p-4.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2 max-w-sm flex-1">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by symbol..."
              className="pl-9 rounded-xl h-9.5"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {watchlistSymbols.length > 0 && (
          <button
            onClick={() => setFilterWatchlist(!filterWatchlist)}
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
          >
            {filterWatchlist ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            My Watchlist Assets Only
          </button>
        )}
      </section>

      {/* Main Grid: Holidays / Earnings */}
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left Side: Holidays */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Market holidays</h2>
          </div>
          <div className="space-y-3">
            {upcomingHolidays.map((holiday) => (
              <div
                key={holiday.date}
                className="flex items-center justify-between gap-3 rounded-xl border p-3 bg-muted/10 hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold">{holiday.name}</p>
                  <p className="text-xs text-muted-foreground">{holiday.date}</p>
                </div>
                <Badge variant="outline" className="border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400">
                  Closed
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Earnings */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm flex flex-col min-h-[350px]">
          <div className="flex items-center gap-1.5 border-b px-4 py-3 bg-muted/25">
            <Newspaper className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Earnings releases</h2>
            <span className="text-xs text-muted-foreground">next 21 days</span>
          </div>
          {filteredEarnings.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground font-semibold">
              No earnings releases found matching your search.
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
                {filteredEarnings.map((event) => (
                  <TableRow key={`${event.symbol}-${event.date}`}>
                    <TableCell>
                      <Link
                        href={`/stock/${event.symbol}`}
                        className="font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {event.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="font-semibold">{event.date}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border">
                        {event.session}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {event.epsEstimate === null ? "-" : formatNumber(event.epsEstimate, 2)}
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
