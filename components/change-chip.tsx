import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChangeChip({
  value,
  suffix = "%",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const up = value >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        up
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(2)}
      {suffix}
    </span>
  );
}
