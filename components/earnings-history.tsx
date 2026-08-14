import { CheckCircle2, XCircle, MinusCircle, HelpCircle } from "lucide-react";
import {
  calculateEarningsStats,
  classifyEarningsSurprise,
  type EarningsSurprise,
} from "@/lib/earnings";

export function EarningsHistory({
  surprises,
  symbol,
}: Readonly<{
  surprises: readonly EarningsSurprise[];
  symbol: string;
}>) {
  if (surprises.length === 0) {
    return null;
  }

  const stats = calculateEarningsStats(surprises);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Quarterly Earnings History</h2>
          <p className="text-xs text-muted-foreground">
            EPS actuals vs consensus estimates for {symbol} (Last {surprises.length} quarters)
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="rounded-full bg-muted px-3 py-1 font-medium">
            Beat Rate:{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {stats.beatRatePercent}%
            </span>{" "}
            ({stats.beatCount}/{stats.beatCount + stats.missCount + stats.meetCount})
          </div>
          {stats.averageSurprisePercent !== null && (
            <div className="rounded-full bg-muted px-3 py-1 font-medium">
              Avg Surprise:{" "}
              <span
                className={`font-bold ${
                  stats.averageSurprisePercent >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {stats.averageSurprisePercent >= 0 ? "+" : ""}
                {stats.averageSurprisePercent}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {surprises.map((item) => {
          const classification = classifyEarningsSurprise(item.actual, item.estimate);
          const periodLabel = item.period
            ? new Date(item.period).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })
            : "Recent";

          return (
            <div
              key={`${item.period}-${item.quarter ?? ""}`}
              className="rounded-xl border bg-muted/20 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  {item.quarter ? `Q${item.quarter}` : ""} {periodLabel}
                </span>
                {classification === "beat" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Beat
                  </span>
                )}
                {classification === "miss" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                    <XCircle className="h-3 w-3" /> Miss
                  </span>
                )}
                {classification === "meet" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <MinusCircle className="h-3 w-3" /> In-Line
                  </span>
                )}
                {classification === "unreported" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <HelpCircle className="h-3 w-3" /> Pending
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Actual EPS</span>
                  <span className="font-bold text-sm tabular-nums">
                    {item.actual !== null ? `$${item.actual.toFixed(2)}` : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Est. EPS</span>
                  <span className="font-medium text-sm tabular-nums text-muted-foreground">
                    {item.estimate !== null ? `$${item.estimate.toFixed(2)}` : "-"}
                  </span>
                </div>
              </div>

              {item.surprisePercent !== null && Number.isFinite(item.surprisePercent) && (
                <div className="text-[11px] text-muted-foreground flex justify-between items-center pt-1 border-t">
                  <span>Surprise</span>
                  <span
                    className={`font-semibold font-mono ${
                      item.surprisePercent >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {item.surprisePercent >= 0 ? "+" : ""}
                    {item.surprisePercent.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
