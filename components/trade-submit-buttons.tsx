"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { IdempotencyKeyInput } from "@/components/idempotency-key-input";
import type { PaperTradeActionState } from "@/lib/paper-trading";

const initialActionState: PaperTradeActionState = {
  status: "idle",
  message: "",
};

type PaperTradeAction = (
  previousState: PaperTradeActionState,
  formData: FormData
) => Promise<PaperTradeActionState>;

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

export function SellAllButton({ symbol }: Readonly<{ symbol: string }>) {
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

export function SellAllForm({
  symbol,
  shares,
  action,
}: Readonly<{
  symbol: string;
  shares: number;
  action: PaperTradeAction;
}>) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction} className="flex justify-end">
        <IdempotencyKeyInput />
        <input type="hidden" name="symbol" value={symbol} />
        <input type="hidden" name="shares" value={shares} />
        <SellAllButton symbol={symbol} />
      </form>
      {state.message && (
        <p
          role="status"
          aria-live="polite"
          className={`max-w-64 text-right text-xs ${
            state.status === "warning"
              ? "text-amber-700 dark:text-amber-400"
              : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
