"use client";

import { Plus, Pencil } from "lucide-react";
import {
  createHolding,
  updateHolding,
} from "@/app/portfolio/actions";
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
import type { HoldingRow } from "@/lib/portfolio";

function HoldingFields({
  holding,
  defaultSymbol,
  defaultAvgCost,
}: {
  holding?: HoldingRow;
  defaultSymbol?: string;
  defaultAvgCost?: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      {holding && <input type="hidden" name="id" value={holding.id} />}
      <div className="grid gap-2">
        <Label htmlFor={holding ? `symbol-${holding.id}` : "symbol-new"}>
          Symbol
        </Label>
        <Input
          id={holding ? `symbol-${holding.id}` : "symbol-new"}
          name="symbol"
          required
          maxLength={12}
          defaultValue={holding?.symbol ?? defaultSymbol ?? ""}
          placeholder="AAPL"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor={holding ? `shares-${holding.id}` : "shares-new"}>
            Shares
          </Label>
          <Input
            id={holding ? `shares-${holding.id}` : "shares-new"}
            name="shares"
            type="number"
            step="any"
            min="0.000001"
            required
            defaultValue={holding?.shares ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={holding ? `avg-cost-${holding.id}` : "avg-cost-new"}>
            Avg cost
          </Label>
          <Input
            id={holding ? `avg-cost-${holding.id}` : "avg-cost-new"}
            name="avgCost"
            type="number"
            step="any"
            min="0.01"
            required
            defaultValue={holding?.avgCost ?? defaultAvgCost ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={holding ? `date-${holding.id}` : "date-new"}>
          Purchase date
        </Label>
        <Input
          id={holding ? `date-${holding.id}` : "date-new"}
          name="purchasedAt"
          type="date"
          required
          defaultValue={holding?.purchasedAt ?? today}
        />
      </div>
    </>
  );
}

export function AddHoldingDialog({
  defaultSymbol,
  defaultAvgCost,
  next,
  trigger,
}: {
  defaultSymbol?: string;
  defaultAvgCost?: number;
  /** Same-origin path to land on after saving (e.g. /portfolio) */
  next?: string;
  /** Custom trigger button; defaults to the portfolio page's Add holding */
  trigger?: React.ReactNode;
} = {}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="rounded-full">
            <Plus className="h-4 w-4" />
            Add holding
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {defaultSymbol ? `Add ${defaultSymbol} to portfolio` : "Add holding"}
          </DialogTitle>
          <DialogDescription>
            Add a stock position to track value and performance.
          </DialogDescription>
        </DialogHeader>
        <form action={createHolding} className="grid gap-4">
          {next && <input type="hidden" name="next" value={next} />}
          <HoldingFields
            defaultSymbol={defaultSymbol}
            defaultAvgCost={defaultAvgCost}
          />
          <DialogFooter>
            <Button type="submit">Save holding</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditHoldingDialog({ holding }: { holding: HoldingRow }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${holding.symbol}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {holding.symbol}</DialogTitle>
          <DialogDescription>
            Update shares, cost basis, or purchase date.
          </DialogDescription>
        </DialogHeader>
        <form action={updateHolding} className="grid gap-4">
          <HoldingFields holding={holding} />
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
