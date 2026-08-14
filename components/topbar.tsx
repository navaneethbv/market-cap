import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleUser, TrendingUp } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notification-center";
import { evaluateAlertNotifications, type AlertNotification } from "@/lib/notifications";
import { getQuote } from "@/lib/market/finnhub";
import type { Quote } from "@/lib/market/types";

export async function Topbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let notifications: AlertNotification[] = [];
  let triggeredCount = 0;

  if (user) {
    const { data: alerts } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user.id)
      .limit(10);

    if (alerts && alerts.length > 0) {
      const symbols = Array.from(new Set(alerts.map((a: { symbol: string }) => a.symbol)));
      const quotesMap: Record<string, Quote | null> = {};
      await Promise.allSettled(
        symbols.map(async (sym) => {
          try {
            const q = await getQuote(sym);
            quotesMap[sym] = q;
          } catch {
            quotesMap[sym] = null;
          }
        })
      );
      const evalResult = evaluateAlertNotifications(alerts, quotesMap);
      notifications = evalResult.notifications;
      triggeredCount = evalResult.triggeredCount;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </span>
          <span className="font-bold">MarketCap</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 md:ml-0 md:flex-1">
          <SearchBox />
          <CommandPalette />
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationCenter
                initialNotifications={notifications}
                initialTriggeredCount={triggeredCount}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    aria-label="Account"
                  >
                    <CircleUser className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="max-w-48 truncate">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action="/auth/signout" method="post" className="w-full">
                      <button type="submit" className="w-full text-left">
                        Sign out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" className="rounded-full px-4" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
