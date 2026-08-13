"use client";

import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";

export interface PortfolioSummaryData {
  portfolioValue: number;
  annualDividends?: number;
  error?: string;
}

export function usePortfolioSync(onSuccess: (data: PortfolioSummaryData) => void) {
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportPortfolio = async () => {
    setImporting(true);
    setImportSuccess(false);
    setImportError(null);

    try {
      const res = await fetch("/api/portfolio/summary");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to import portfolio");
      }
      onSuccess(data);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setImportError("Could not retrieve active portfolio value");
    } finally {
      setImporting(false);
    }
  };

  return {
    importing,
    importSuccess,
    importError,
    handleImportPortfolio,
  };
}

function renderButtonContent(importing: boolean, importSuccess: boolean) {
  if (importing) {
    return (
      <>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Syncing...</span>
      </>
    );
  }
  if (importSuccess) {
    return (
      <>
        <CheckCircle className="h-3 w-3 text-green-400" />
        <span className="text-green-400">Synced!</span>
      </>
    );
  }
  return <span>Sync Portfolio</span>;
}

export function SyncPortfolioButton({
  importing,
  importSuccess,
  onClick,
}: Readonly<{
  importing: boolean;
  importSuccess: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={importing}
      className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-all disabled:opacity-50"
    >
      {renderButtonContent(importing, importSuccess)}
    </button>
  );
}
