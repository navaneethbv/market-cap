"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportScreenerToCsv, type ScreenerStock } from "@/lib/screener";
import { downloadCsvFile } from "@/lib/download-csv";

export function ScreenerExportButton({
  stocks,
}: Readonly<{
  stocks: readonly ScreenerStock[];
}>) {
  function handleExport() {
    if (stocks.length === 0) return;
    const csv = exportScreenerToCsv(stocks);
    const filename = `marketcap-screener-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvFile(csv, filename);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={stocks.length === 0}
      className="rounded-full gap-1.5 text-xs"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV ({stocks.length})
    </Button>
  );
}
