"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import type { AlertNotification } from "@/lib/notifications";

export function NotificationCenter({
  initialNotifications = [],
  initialTriggeredCount = 0,
}: Readonly<{
  initialNotifications?: readonly AlertNotification[];
  initialTriggeredCount?: number;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications] = useState<readonly AlertNotification[]>(initialNotifications);
  const [triggeredCount] = useState<number>(initialTriggeredCount);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Price Alerts & Notifications"
      >
        <Bell className="h-4 w-4" />
        {triggeredCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {triggeredCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border bg-popover p-3 shadow-xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between border-b pb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Notifications</span>
              {triggeredCount > 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                  {triggeredCount} Triggered
                </span>
              )}
            </div>
            <Link
              href="/alerts"
              onClick={() => setIsOpen(false)}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              Alerts <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="max-h-72 overflow-y-auto py-2 space-y-1.5">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No active price alerts set up yet.
              </div>
            ) : (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  href={`/stock/${item.symbol}`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-start justify-between rounded-xl p-2.5 text-xs transition ${
                    item.isTriggered
                      ? "bg-red-500/10 hover:bg-red-500/15 text-foreground"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <span>{item.symbol}</span>
                      {item.direction === "above" ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span>${item.targetPrice.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] leading-tight">{item.message}</p>
                  </div>
                  {item.isTriggered ? (
                    <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      TRIGGERED
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      Active
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>

          <div className="border-t pt-2 text-center">
            <Link
              href="/alerts"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground block"
            >
              Configure price triggers & targets →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
