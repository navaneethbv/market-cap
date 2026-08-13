"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function PricingSubmitButton({
  children,
  className,
  pendingLabel,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className={className} disabled={pending}>
      {pending ? (pendingLabel ?? "Working...") : children}
    </Button>
  );
}