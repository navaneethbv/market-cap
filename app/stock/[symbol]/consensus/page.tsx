"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Award, ShieldAlert, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ symbol: string }>;
}

interface ConsensusData {
  consensusScore: number;
  label: string;
  rationale: string;
  upsideDrivers: string[];
  downsideRisks: string[];
  isMock: boolean;
}

export default function ConsensusPage({ params }: PageProps) {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConsensusData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/stock/${upperSymbol}/consensus`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("Failed to compile stock consensus valuation. Ensure you are signed in.");
        setLoading(false);
      });
  }, [upperSymbol]);

  const getConsensusColor = (score: number) => {
    if (score <= 20) return "text-emerald-600 dark:text-emerald-400 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score <= 40) return "text-teal-600 dark:text-teal-400 stroke-teal-500 bg-teal-500/10 border-teal-500/20";
    if (score <= 60) return "text-violet-600 dark:text-violet-400 stroke-violet-500 bg-violet-500/10 border-violet-500/20";
    if (score <= 80) return "text-amber-600 dark:text-amber-400 stroke-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-rose-600 dark:text-rose-400 stroke-rose-500 bg-rose-500/10 border-rose-500/20";
  };

  const getStrokeColor = (score: number) => {
    if (score <= 20) return "rgb(16, 185, 129)"; // emerald-500
    if (score <= 40) return "rgb(20, 184, 166)"; // teal-500
    if (score <= 60) return "rgb(139, 92, 246)"; // violet-500
    if (score <= 80) return "rgb(245, 158, 11)"; // amber-500
    return "rgb(244, 63, 94)"; // rose-500
  };

  const score = data?.consensusScore ?? 50;
  const strokeOffset = 125 - (125 * score) / 100;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/stock/${symbol}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Valuation Consensus</h1>
          <p className="text-muted-foreground">
            Gemini AI aggregated consensus indicators, valuation drivers, and risks for {upperSymbol}.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generating consensus valuation gauge...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 text-center">
          {errorMsg}
        </div>
      ) : data ? (
        <div className="grid gap-6 md:grid-cols-3 items-start">
          {/* Left Panel: Gauge */}
          <div className="p-6 rounded-xl border bg-card shadow-sm space-y-6 flex flex-col items-center">
            <h2 className="text-sm font-bold text-muted-foreground uppercase text-center w-full border-b pb-2">
              Consensus Gauge
            </h2>

            <div className="relative w-full max-w-[200px] flex items-center justify-center">
              <svg viewBox="0 0 100 55" className="w-full overflow-visible">
                {/* Background Track */}
                <path
                  d="M 10 45 A 35 35 0 0 1 90 45"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Value Arc */}
                <path
                  d="M 10 45 A 35 35 0 0 1 90 45"
                  fill="none"
                  stroke={getStrokeColor(score)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="125"
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Text inside absolute overlay */}
              <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {score}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
                  Score
                </span>
              </div>
            </div>

            <div className={cn("px-4 py-1.5 rounded-full text-xs font-bold border", getConsensusColor(score))}>
              {data.label}
            </div>

            <div className="text-[11px] leading-relaxed text-muted-foreground border-t pt-4 text-center w-full">
              Score ranges from 0 (Deep Value) to 100 (Speculative / Premium growth multipliers).
            </div>
          </div>

          {/* Right Panel: Drivers & Summary */}
          <div className="md:col-span-2 space-y-6">
            {/* Rationale Summary */}
            <div className="p-6 rounded-xl border bg-card shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase">AI Rationale Summary</h2>
              <p className="text-sm text-foreground font-medium leading-relaxed bg-muted/20 p-4 rounded-xl border italic">
                &quot;{data.rationale}&quot;
              </p>
            </div>

            {/* Drivers vs Risks */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Upside */}
              <div className="p-6 rounded-xl border bg-card shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b pb-2">
                  <Award className="h-4 w-4" />
                  Upside Drivers
                </h3>
                <ul className="space-y-3">
                  {data.upsideDrivers.map((driver, idx) => (
                    <li key={`up-${idx}`} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="p-6 rounded-xl border bg-card shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 border-b pb-2">
                  <ShieldAlert className="h-4 w-4" />
                  Valuation Risks
                </h3>
                <ul className="space-y-3">
                  {data.downsideRisks.map((risk, idx) => (
                    <li key={`down-${idx}`} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                      <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
