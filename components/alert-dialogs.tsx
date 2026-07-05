"use client";

import { Pencil, Plus } from "lucide-react";
import { createAlert, updateAlert } from "@/app/alerts/actions";
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
import type { AlertRow } from "@/lib/alerts";

function AlertFields({ alert }: { alert?: AlertRow }) {
  return (
    <>
      {alert && <input type="hidden" name="id" value={alert.id} />}
      <div className="grid gap-2">
        <Label htmlFor={alert ? `alert-symbol-${alert.id}` : "alert-symbol-new"}>
          Symbol
        </Label>
        <Input
          id={alert ? `alert-symbol-${alert.id}` : "alert-symbol-new"}
          name="symbol"
          required
          maxLength={12}
          defaultValue={alert?.symbol ?? ""}
          placeholder="AAPL"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label
            htmlFor={alert ? `alert-direction-${alert.id}` : "alert-direction-new"}
          >
            Direction
          </Label>
          <select
            id={alert ? `alert-direction-${alert.id}` : "alert-direction-new"}
            name="direction"
            required
            defaultValue={alert?.direction ?? "above"}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label
            htmlFor={alert ? `alert-target-${alert.id}` : "alert-target-new"}
          >
            Target price
          </Label>
          <Input
            id={alert ? `alert-target-${alert.id}` : "alert-target-new"}
            name="targetPrice"
            type="number"
            step="any"
            min="0.01"
            required
            defaultValue={alert?.targetPrice ?? ""}
            placeholder="250"
          />
        </div>
      </div>
      <div className="flex items-center space-x-2 py-1">
        <input
          id={alert ? `alert-email-${alert.id}` : "alert-email-new"}
          name="notifyEmail"
          type="checkbox"
          defaultChecked={alert?.notifyEmail ?? false}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor={alert ? `alert-email-${alert.id}` : "alert-email-new"} className="text-xs font-semibold text-muted-foreground">
          Send Email Notification (Mocked)
        </Label>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={alert ? `alert-webhook-${alert.id}` : "alert-webhook-new"}>
          Webhook URL (Discord / Slack)
        </Label>
        <Input
          id={alert ? `alert-webhook-${alert.id}` : "alert-webhook-new"}
          name="webhookUrl"
          type="url"
          defaultValue={alert?.webhookUrl ?? ""}
          placeholder="https://discord.com/api/webhooks/..."
        />
      </div>
    </>
  );
}

export function AddAlertDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <Plus className="h-4 w-4" />
          Add alert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add price alert</DialogTitle>
          <DialogDescription>
            Set a target and track whether the latest quote has crossed it.
          </DialogDescription>
        </DialogHeader>
        <form action={createAlert} className="grid gap-4">
          <AlertFields />
          <DialogFooter>
            <Button type="submit">Save alert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditAlertDialog({ alert }: { alert: AlertRow }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${alert.symbol} alert`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {alert.symbol} alert</DialogTitle>
          <DialogDescription>
            Change the rule and reset the target crossing state.
          </DialogDescription>
        </DialogHeader>
        <form action={updateAlert} className="grid gap-4">
          <AlertFields alert={alert} />
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
