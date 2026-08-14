"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTradesToCsv, type PaperTrade } from "@/lib/paper-trading";

export function ExportTradesButton({
  trades,
}: Readonly<{
  trades: readonly PaperTrade[];
}>) {
  function handleExport() {
    if (trades.length === 0) return;
    const csvContent = exportTradesToCsv(trades);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `marketcap-paper-trades-${new Date().toISOString().slice(0, 10)}.csv`
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
      disabled={trades.length === 0}
      className="rounded-full flex items-center gap-1.5"
      aria-label="Export trade history to CSV"
    >
      <Download className="h-3.5 w-3.5" />
      <span>Export CSV</span>
    </Button>
  );
}
