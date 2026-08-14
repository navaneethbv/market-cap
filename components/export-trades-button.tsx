"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTradesToCsv, type PaperTrade } from "@/lib/paper-trading";
import { downloadCsvFile } from "@/lib/download-csv";

export function ExportTradesButton({
  trades,
}: Readonly<{
  trades: readonly PaperTrade[];
}>) {
  function handleExport() {
    if (trades.length === 0) return;
    const csvContent = exportTradesToCsv(trades);
    const filename = `marketcap-paper-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvFile(csvContent, filename);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={trades.length === 0}
      className="rounded-full flex items-center gap-1.5"
      aria-label="Export trade history to CSV"
    >
      <Download className="h-3.5 w-3.5" />
      <span>Export CSV</span>
    </Button>
  );
}
