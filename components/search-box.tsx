"use client";

// Placeholder until Phase 2 wires in Finnhub symbol search
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SearchBox() {
  return (
    <div className="relative hidden md:block">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search stocks..."
        className="w-56 pl-8"
        disabled
        aria-label="Search stocks"
      />
    </div>
  );
}
