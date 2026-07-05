"use client";

import { Radio } from "lucide-react";
import { ChangeChip } from "@/components/change-chip";
import { formatPrice } from "@/lib/format";
import type { Quote } from "@/lib/market/types";
import { useLivePrice } from "@/hooks/useLivePrice";

export function LivePriceDisplay({
  symbol,
  initialQuote,
}: {
  symbol: string;
  initialQuote: Quote;
}) {
  const { quote, status } = useLivePrice({ symbol, initialQuote });

  return (
    <>
      <div className="text-4xl font-bold tabular-nums tracking-tight">
        {formatPrice(quote.price)}
      </div>
      <div className="flex items-center gap-2 lg:justify-end">
        <ChangeChip value={quote.changePercent} />
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {quote.change >= 0 ? "+" : ""}
          {formatPrice(quote.change)}
        </span>
      </div>
      <div className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
        <Radio className="h-3 w-3" />
        {status}
      </div>
    </>
  );
}
