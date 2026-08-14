"use client";

import { useState, useTransition } from "react";
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  generatePortfolioCsv,
  parsePortfolioCsv,
  type PortfolioCsvExportable,
} from "@/lib/portfolio-csv";
import { importHoldingsFromCsv } from "@/app/portfolio/actions";
import type { NormalizedHoldingInput } from "@/lib/portfolio";
import { formatPrice } from "@/lib/format";

export function ExportPortfolioCsvButton({
  holdings,
}: Readonly<{
  holdings: readonly PortfolioCsvExportable[];
}>) {
  function handleExport() {
    if (holdings.length === 0) return;
    const csvContent = generatePortfolioCsv(holdings);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `marketcap-portfolio-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={holdings.length === 0}
      className="rounded-full flex items-center gap-1.5"
      aria-label="Export portfolio to CSV"
    >
      <Download className="h-3.5 w-3.5" />
      <span>Export CSV</span>
    </Button>
  );
}

export function ImportPortfolioCsvDialog() {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<NormalizedHoldingInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result ?? "");
      setCsvText(text);
      tryParse(text);
    };
    reader.readAsText(file);
  }

  function tryParse(text: string) {
    setError(null);
    try {
      const parsed = parsePortfolioCsv(text);
      setPreview(parsed);
      if (parsed.length === 0 && text.trim().length > 0) {
        setError("No valid rows found in CSV.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
      setPreview([]);
    }
  }

  function handleImport() {
    if (preview.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        await importHoldingsFromCsv(csvText);
        setOpen(false);
        setCsvText("");
        setPreview([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full flex items-center gap-1.5"
          aria-label="Import portfolio from CSV"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Import CSV</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span>Import Portfolio Holdings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Upload or paste a CSV with columns:{" "}
            <code className="font-mono bg-muted px-1 py-0.5 rounded">
              Symbol, Shares, Avg Cost, Purchased At (optional)
            </code>
          </p>

          <div className="flex items-center gap-3">
            <input
              id="csv-file-upload"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="text-xs file:mr-2 file:rounded-full file:border file:bg-muted file:px-3 file:py-1 file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-accent"
              aria-label="Upload CSV File"
            />
          </div>

          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              tryParse(e.target.value);
            }}
            placeholder="AAPL,10,150.25,2026-01-15&#10;MSFT,5,320.00,2026-02-01"
            rows={4}
            className="w-full rounded-xl border bg-background p-2.5 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Paste CSV text"
          />

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview.length > 0 && (
            <div className="rounded-xl border p-3 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Preview ({preview.length} holdings)</span>
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                  <Check className="h-3 w-3" /> Valid CSV
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {preview.map((row) => (
                  <div
                    key={`${row.symbol}-${row.purchasedAt}`}
                    className="flex justify-between items-center text-xs py-1 border-b last:border-0"
                  >
                    <span className="font-semibold">{row.symbol}</span>
                    <span className="text-muted-foreground">{row.shares} shares @ {formatPrice(row.avgCost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImport}
              disabled={preview.length === 0 || isPending}
              className="flex items-center gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Import {preview.length} Holdings</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
