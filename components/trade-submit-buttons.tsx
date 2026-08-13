"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function TradeTicketButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-2">
      <Button
        type="submit"
        name="side"
        value="buy"
        disabled={pending}
        className="rounded-full"
      >
        Buy
      </Button>
      <Button
        type="submit"
        name="side"
        value="sell"
        variant="outline"
        disabled={pending}
        className="rounded-full"
      >
        Sell
      </Button>
    </div>
  );
}

export function SellAllButton({ symbol }: { symbol: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="side"
      value="sell"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Sell all ${symbol}`}
    >
      {pending ? "Selling..." : "Sell all"}
    </Button>
  );
}
