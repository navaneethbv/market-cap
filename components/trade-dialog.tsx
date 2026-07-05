"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { executePaperTrade } from "@/app/portfolio/paper-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TradeDialog({
  symbol,
  currentPrice,
}: {
  symbol: string;
  currentPrice: number;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [shares, setShares] = useState<number>(0);
  const [price, setPrice] = useState<number>(currentPrice);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setLoadingBalance(true);
        setErrorMessage("");
        setShares(0);
        setPrice(currentPrice);
      });
      
      fetch("/api/portfolio/paper/cash")
        .then((res) => res.json())
        .then((data) => {
          if (data.cashBalance !== undefined) {
            setCashBalance(data.cashBalance);
          }
        })
        .catch(() => {
          setErrorMessage("Failed to load cash balance");
        })
        .finally(() => {
          setLoadingBalance(false);
        });
    }
  }, [open, currentPrice]);

  const totalCost = shares * price;
  const hasCash = cashBalance !== null;
  const remainingCash = hasCash
    ? type === "BUY"
      ? cashBalance - totalCost
      : cashBalance + totalCost
    : 0;

  const isInvalid =
    shares <= 0 ||
    price <= 0 ||
    loadingBalance ||
    (type === "BUY" && hasCash && remainingCash < 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("symbol", symbol);
      formData.append("type", type);
      formData.append("shares", String(shares));
      formData.append("price", String(price));

      await executePaperTrade(formData);
      setOpen(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Simulated Trade: {symbol}</DialogTitle>
            <DialogDescription>
              Execute a simulated stock purchase or sale.
            </DialogDescription>
          </DialogHeader>

          {/* Segmented Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setType("BUY")}
              className={cn(
                "rounded-lg py-1.5 text-xs font-semibold transition-all",
                type === "BUY"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Buy Position
            </button>
            <button
              type="button"
              onClick={() => setType("SELL")}
              className={cn(
                "rounded-lg py-1.5 text-xs font-semibold transition-all",
                type === "SELL"
                  ? "bg-background text-red-600 dark:text-red-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sell Position
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="trade-shares">Shares</Label>
              <Input
                id="trade-shares"
                type="number"
                step="any"
                min="0.000001"
                placeholder="0"
                required
                value={shares || ""}
                onChange={(e) => setShares(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trade-price">Limit Price ($)</Label>
              <div className="flex gap-2">
                <Input
                  id="trade-price"
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={price || ""}
                  onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPrice(currentPrice)}
                  className="rounded-lg text-xs"
                >
                  Market
                </Button>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Preview */}
          <div className="rounded-xl border bg-muted/20 p-4.5 space-y-2 text-xs leading-relaxed">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Virtual Cash:</span>
              <span className="font-semibold tabular-nums">
                {loadingBalance ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground inline" />
                ) : hasCash ? (
                  formatPrice(cashBalance)
                ) : (
                  "-"
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Estimated Value:</span>
              <span className="font-semibold tabular-nums">
                {formatPrice(totalCost)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-1">
              <span className="text-muted-foreground font-bold">Remaining Cash:</span>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  type === "BUY" && remainingCash < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-foreground"
                )}
              >
                {loadingBalance ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground inline" />
                ) : hasCash ? (
                  formatPrice(remainingCash)
                ) : (
                  "-"
                )}
              </span>
            </div>
            {type === "BUY" && hasCash && remainingCash < 0 && (
              <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-1">
                Warning: Insufficient cash balance to execute this trade.
              </p>
            )}
          </div>

          {errorMessage && (
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              {errorMessage}
            </p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isInvalid || submitting}
              className={cn(
                "rounded-full w-full",
                type === "BUY"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Execute {type === "BUY" ? "Purchase" : "Sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
