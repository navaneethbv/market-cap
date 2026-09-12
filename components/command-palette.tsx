"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  TrendingUp,
  LayoutDashboard,
  Eye,
  Briefcase,
  Sliders,
  DollarSign,
  PlayCircle,
  Filter,
  Flame,
  Newspaper,
  Calendar,
  Users,
  Moon,
  Sun,
  ArrowRight,
  Loader2,
  X,
  Scale,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import type { SymbolSearchResult } from "@/lib/market/types";

interface NavItem {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof LayoutDashboard;
  href: string;
  category: "Navigation" | "Tools";
}

interface ActionItem {
  type: "nav" | "stock" | "theme";
  id: string;
  label: string;
  detail?: string;
  onSelect: () => void;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: "nav-dash", title: "Dashboard", subtitle: "Market overview & indexes", icon: LayoutDashboard, href: "/", category: "Navigation" },
  { id: "nav-watch", title: "Watchlist", subtitle: "Saved stocks & sparklines", icon: Eye, href: "/watchlist", category: "Navigation" },
  { id: "nav-port", title: "Portfolio", subtitle: "Holdings, performance & dividends", icon: Briefcase, href: "/portfolio", category: "Navigation" },
  { id: "nav-heatmap", title: "Sector Heatmap", subtitle: "Live sector treemap & performance", icon: Flame, href: "/heatmap", category: "Navigation" },
  { id: "nav-options", title: "Options Calculator", subtitle: "Payoff diagrams & strategy simulator", icon: Sliders, href: "/options", category: "Tools" },
  { id: "nav-alloc", title: "Allocation", subtitle: "Asset weights & concentration", icon: Sliders, href: "/portfolio/allocation", category: "Navigation" },
  { id: "nav-rebalance", title: "Rebalance Calculator", subtitle: "Target allocation rebalancing plan", icon: Scale, href: "/portfolio/rebalance", category: "Tools" },
  { id: "nav-income", title: "Dividend Income Calendar", subtitle: "12-month cash flows & Yield on Cost", icon: DollarSign, href: "/portfolio/income", category: "Tools" },
  { id: "nav-tax-loss", title: "Tax-Loss Harvesting", subtitle: "Loss harvesting & wash-sale ETF substitutes", icon: Briefcase, href: "/portfolio/tax-loss", category: "Tools" },
  { id: "nav-snow", title: "Dividend Snowball", subtitle: "DRIP & compounding planner", icon: DollarSign, href: "/portfolio/snowball", category: "Tools" },
  { id: "nav-risk", title: "Risk Diagnostics", subtitle: "Portfolio Beta, HHI & Monte Carlo", icon: Sliders, href: "/portfolio/risk", category: "Tools" },
  { id: "nav-trade", title: "Paper Trading", subtitle: "$100k virtual trading account", icon: PlayCircle, href: "/trading", category: "Navigation" },
  { id: "nav-backtest", title: "Backtesting Engine", subtitle: "SMA & RSI strategy simulator", icon: PlayCircle, href: "/backtest", category: "Tools" },
  { id: "nav-screen", title: "Stock Screener", subtitle: "Filter by sector, cap, beta & valuation", icon: Filter, href: "/screener", category: "Tools" },
  { id: "nav-movers", title: "Market Movers", subtitle: "Top gainers, losers & baskets", icon: Flame, href: "/movers", category: "Navigation" },
  { id: "nav-compare", title: "Compare Stocks", subtitle: "Side-by-side performance, matrix & radar", icon: TrendingUp, href: "/compare", category: "Tools" },
  { id: "nav-news", title: "Market News", subtitle: "Latest headlines & sentiment", icon: Newspaper, href: "/news", category: "Navigation" },
  { id: "nav-cal", title: "Market Calendar", subtitle: "Holidays & earnings releases", icon: Calendar, href: "/calendar", category: "Tools" },
  { id: "nav-insider", title: "Insider Trading", subtitle: "Form 4 buys and sells", icon: Users, href: "/insiders", category: "Tools" },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function openPalette() {
    setQuery("");
    setSelectedIndex(0);
    setSearchResults([]);
    setIsOpen(true);
    setLoading(false);
  }

  function closePalette() {
    setIsOpen(false);
    setLoading(false);
    setQuery("");
    setSearchResults([]);
  }

  // Toggle with keyboard shortcut Meta+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          closePalette();
        } else {
          openPalette();
        }
      }
      if (e.key === "Escape" && isOpen) {
        closePalette();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedIndex(0);
    setSearchResults([]);
    setLoading(value.trim().length > 0);
  }

  // Debounced search for ticker symbols
  useEffect(() => {
    const q = query.trim();
    if (!isOpen || q.length < 1) return;

    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { results: SymbolSearchResult[] };
        if (active) {
          setSearchResults(data.results.slice(0, 6));
          setSelectedIndex(0);
        }
      } catch {
        // aborted or error
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  // Filtered navigation list
  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [query]);

  // Flattened actionable list for keyboard navigation
  const allActions = useMemo<ActionItem[]>(() => {
    const actions: ActionItem[] = [];
    const q = query.trim().toLowerCase();

    // Stock search results
    for (const stock of searchResults) {
      actions.push({
        type: "stock",
        id: `stock-${stock.symbol}`,
        label: stock.symbol,
        detail: stock.description,
        onSelect: () => {
          closePalette();
          router.push(`/stock/${encodeURIComponent(stock.symbol)}`);
        },
      });
    }

    // Navigation items
    for (const nav of filteredNav) {
      actions.push({
        type: "nav",
        id: nav.id,
        label: nav.title,
        detail: nav.subtitle,
        onSelect: () => {
          closePalette();
          router.push(nav.href);
        },
      });
    }

    // Theme action
    if (q.length > 0 && "dark theme light mode".includes(q)) {
      actions.push({
        type: "theme",
        id: "theme-toggle",
        label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        detail: "Change application color scheme",
        onSelect: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          closePalette();
        },
      });
    }

    return actions;
  }, [query, searchResults, filteredNav, theme, setTheme, router]);

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (allActions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allActions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allActions.length) % allActions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = allActions[selectedIndex];
      if (action) {
        action.onSelect();
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeElement = listRef.current.querySelector(`[data-active="true"]`);
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? openPalette() : closePalette()}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span className="md:hidden">Search</span>
          <span className="hidden md:inline">Quick search...</span>
          <kbd className="ml-2 hidden rounded border px-1 font-mono text-[10px] md:inline">⌘K</kbd>
        </button>
      </DialogTrigger>
      <DialogContent
        className="top-[8dvh] block max-h-[84dvh] -translate-y-0 overflow-hidden rounded-2xl border bg-card p-0 sm:max-w-xl"
        onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}
      >
        <DialogTitle className="sr-only">Search MarketCap</DialogTitle>
        <DialogDescription className="sr-only">Search stocks and tools. Use the arrow keys and Enter to select a result.</DialogDescription>
        {/* Search header */}
        <div className="flex items-center border-b pl-4 pr-12">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a ticker symbol or command (e.g. AAPL, Watchlist, Theme)..."
            className="flex h-12 w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Command search input"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          {query.length > 0 && !loading && (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Results Body */}
        <div ref={listRef} className="max-h-[55dvh] overflow-y-auto p-2">
          {allActions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-3">
              {/* Tickers section */}
              {searchResults.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Stocks & Assets
                  </div>
                  <div className="space-y-0.5">
                    {searchResults.map((stock) => {
                      const actionIndex = allActions.findIndex((a) => a.id === `stock-${stock.symbol}`);
                      const isSelected = actionIndex === selectedIndex;
                      return (
                        <button
                          key={stock.symbol}
                          type="button"
                          data-active={isSelected}
                          onClick={() => {
                            closePalette();
                            router.push(`/stock/${encodeURIComponent(stock.symbol)}`);
                          }}
                          onMouseEnter={() => setSelectedIndex(actionIndex)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs">
                              {stock.symbol.slice(0, 3)}
                            </span>
                            <div>
                              <div className="font-semibold">{stock.symbol}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[12rem] sm:max-w-xs">{stock.description}</div>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation section */}
              {filteredNav.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Navigation & Tools
                  </div>
                  <div className="space-y-0.5">
                    {filteredNav.map((item) => {
                      const actionIndex = allActions.findIndex((a) => a.id === item.id);
                      const isSelected = actionIndex === selectedIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-active={isSelected}
                          onClick={() => {
                            closePalette();
                            router.push(item.href);
                          }}
                          onMouseEnter={() => setSelectedIndex(actionIndex)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div>
                              <div className="font-medium">{item.title}</div>
                              <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                            </div>
                          </div>
                          <span className="hidden shrink-0 text-[11px] text-muted-foreground font-mono sm:inline">{item.href}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Theme Quick Action */}
              {"dark theme light mode".includes(query.toLowerCase().trim()) && query.trim().length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </div>
                  {allActions.filter((a) => a.type === "theme").map((action) => {
                    const actionIndex = allActions.findIndex((a) => a.id === action.id);
                    const isSelected = actionIndex === selectedIndex;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        data-active={isSelected}
                        onClick={action.onSelect}
                        onMouseEnter={() => setSelectedIndex(actionIndex)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                          </span>
                          <div>
                            <div className="font-medium">{action.label}</div>
                            <div className="text-xs text-muted-foreground">{action.detail}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-background px-1 font-mono">↑</kbd> <kbd className="rounded border bg-background px-1 font-mono">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="rounded border bg-background px-1 font-mono">↵</kbd> Select
            </span>
            <span>
              <kbd className="rounded border bg-background px-1 font-mono">ESC</kbd> Close
            </span>
          </div>
          <span className="hidden sm:inline">MarketCap Terminal</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
