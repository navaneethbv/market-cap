"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCorrelationLabel } from "@/lib/correlation";
import { cn } from "@/lib/utils";

export default function CorrelationPage() {
  const [symbolsInput, setSymbolsInput] = useState("AAPL, MSFT, KO, WMT");
  const [loading, setLoading] = useState(true);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<number[][]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; logo: string }>>({});
  const [selectedCell, setSelectedCell] = useState<{ i: number; j: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCorrelation = (syms: string) => {
    setLoading(true);
    setErrorMsg("");
    setSelectedCell(null);
    fetch(`/api/compare/correlation?symbols=${encodeURIComponent(syms)}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setSymbols(data.symbols || []);
        setMatrix(data.matrix || []);
        setProfiles(data.profiles || {});
        if (data.symbols && data.symbols.length > 1) {
          setSelectedCell({ i: 0, j: 1 });
        }
      })
      .catch(() => {
        setErrorMsg("Failed to compute correlation. Please verify symbols and try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchCorrelation("AAPL, MSFT, KO, WMT");
    });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCorrelation(symbolsInput);
  };

  const getCellColor = (val: number) => {
    if (val === 1.0) return "bg-neutral-800 dark:bg-neutral-200 text-neutral-100 dark:text-neutral-900";
    if (val >= 0.7) return "bg-violet-700 text-white";
    if (val >= 0.3) return "bg-violet-500/70 text-white";
    if (val >= -0.3) return "bg-muted text-muted-foreground";
    if (val >= -0.7) return "bg-rose-500/70 text-white";
    return "bg-rose-700 text-white";
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/compare">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Correlation Heatmap Matrix</h1>
          <p className="text-muted-foreground">
            Analyze correlation indexes and diversification benefits for multiple assets.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-lg">
        <Input
          value={symbolsInput}
          onChange={(e) => setSymbolsInput(e.target.value)}
          placeholder="e.g. AAPL, MSFT, KO, WMT"
          className="bg-card font-semibold"
        />
        <Button type="submit">Analyze</Button>
      </form>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Computing price correlations...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 text-center">
          {errorMsg}
        </div>
      ) : symbols.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No stock symbols loaded.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Heatmap Grid */}
          <div className="space-y-4">
            <div className="overflow-x-auto p-2 bg-card border rounded-xl shadow-sm">
              <div className="min-w-[340px] grid grid-cols-5 gap-2 p-2">
                {/* Top-left empty label */}
                <div className="h-14 flex items-center justify-center text-xs font-bold text-muted-foreground">
                  Asset
                </div>
                {/* Horizontal Header Labels */}
                {symbols.map((s) => (
                  <div
                    key={`header-h-${s}`}
                    className="h-14 flex flex-col items-center justify-center text-xs font-bold text-center"
                  >
                    <span className="text-sm font-extrabold text-foreground">{s}</span>
                  </div>
                ))}

                {/* Grid Rows */}
                {symbols.map((sRow, i) => (
                  <div key={`row-${sRow}`} className="contents">
                    {/* Vertical Header Label */}
                    <div className="h-14 flex items-center justify-start text-xs font-bold pr-2">
                      <span className="text-sm font-extrabold text-foreground">{sRow}</span>
                    </div>

                    {/* Pairwise Cells */}
                    {symbols.map((sCol, j) => {
                      const val = matrix[i][j];
                      const isSelected = selectedCell?.i === i && selectedCell?.j === j;
                      return (
                        <button
                          key={`cell-${i}-${j}`}
                          onClick={() => setSelectedCell({ i, j })}
                          className={cn(
                            "h-14 rounded-lg flex items-center justify-center font-mono font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                            getCellColor(val),
                            isSelected && "ring-4 ring-offset-2 ring-primary scale-105 shadow-md"
                          )}
                        >
                          {val.toFixed(2)}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-between items-center px-2 text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-rose-700 rounded-sm" /> Inverse (-1.0)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-neutral-200 dark:bg-neutral-800 rounded-sm border" /> Independent (0.0)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-violet-700 rounded-sm" /> Correlated (+1.0)
              </span>
            </div>
          </div>

          {/* Details Card */}
          <div className="p-6 bg-card border rounded-xl shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Correlation Analysis
            </h2>

            {selectedCell ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="text-md font-bold text-foreground">
                      {symbols[selectedCell.i]} vs {symbols[selectedCell.j]}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {profiles[symbols[selectedCell.i]]?.name || symbols[selectedCell.i]} /{" "}
                      {profiles[symbols[selectedCell.j]]?.name || symbols[selectedCell.j]}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-extrabold text-foreground">
                      {matrix[selectedCell.i][selectedCell.j].toFixed(4)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wide">
                      Coefficient
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-primary">
                    {getCorrelationLabel(matrix[selectedCell.i][selectedCell.j]).label}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {getCorrelationLabel(matrix[selectedCell.i][selectedCell.j]).description}
                  </p>
                </div>

                {selectedCell.i === selectedCell.j && (
                  <p className="text-xs text-muted-foreground italic bg-muted/50 p-2.5 rounded-lg">
                    * Comparing an asset to itself always yields a correlation of 1.00.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Select any cell in the heatmap grid to view diversification insights.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
