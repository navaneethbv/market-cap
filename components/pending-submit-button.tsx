"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function PendingSubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (pendingLabel ?? "Saving...") : children}
    </Button>
  );
}
