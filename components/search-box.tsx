"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SymbolSearchResult } from "@/lib/market/types";

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: SymbolSearchResult[] };
        setResults(data.results);
        setOpen(true);
      } catch {
        // aborted or failed; keep previous results
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(symbol: string) {
    setOpen(false);
    setQuery("");
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) go(results[0].symbol);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search stocks..."
        className="rounded-full bg-card pl-9 pr-9"
        aria-label="Search stocks"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No matches. Try a ticker like AAPL.
            </p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    onClick={() => go(r.symbol)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-semibold">{r.symbol}</span>
                    <span className="truncate text-muted-foreground">
                      {r.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
