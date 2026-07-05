"use client";

import { RotateCcw } from "lucide-react";
import { resetPaperAccount } from "@/app/trading/actions";
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

export function ResetAccountDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <RotateCcw className="h-4 w-4" />
          Reset account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset paper account?</DialogTitle>
          <DialogDescription>
            This deletes every trade and your equity history, and returns the
            account to $100,000 in cash. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form action={resetPaperAccount}>
          <DialogFooter>
            <Button
              type="submit"
              variant="destructive"
              className="rounded-full"
            >
              Reset account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
