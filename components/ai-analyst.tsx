"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Send, Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisData {
  consensus: "Bullish" | "Bearish" | "Neutral";
  summary: string;
  bullCase: string[];
  bearCase: string[];
  isMock?: boolean;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export function AIAnalyst({ symbol }: { symbol: string }) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/stock/${symbol}/analysis`);
        if (!res.ok) {
          throw new Error("Failed to fetch analyst insights");
        }
        const data = (await res.json()) as AnalysisData;
        setAnalysis(data);

        // Seed initial message
        setMessages([
          {
            sender: "ai",
            text: `Hi! I have analyzed the profile, metrics, and news for ${symbol}. The current outlook is ${data.consensus.toLowerCase()}. Ask me anything about its financials, competitors, or risk profile!`,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Insights unavailable");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [symbol]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const query = inputText.trim();
    if (!query || sending) return;

    setInputText("");
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    setSending(true);

    try {
      const res = await fetch(`/api/stock/${symbol}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate response");
      }

      const data = (await res.json()) as { reply: string };
      setMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry, I ran into an issue while generating an answer. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Running AI equity analysis...</p>
      </section>
    );
  }

  if (error || !analysis) {
    return (
      <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-destructive">AI Analysis Unreachable</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {error || "We could not compile reports for this ticker at this time."}
        </p>
      </section>
    );
  }

  const consensusTone =
    analysis.consensus === "Bullish"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
      : analysis.consensus === "Bearish"
      ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
      : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";

  const consensusIcon =
    analysis.consensus === "Bullish" ? (
      <ArrowUpRight className="h-4 w-4 shrink-0" />
    ) : analysis.consensus === "Bearish" ? (
      <ArrowDownRight className="h-4 w-4 shrink-0" />
    ) : (
      <Minus className="h-4 w-4 shrink-0" />
    );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI Research Analyst</h2>
              <p className="text-xs text-muted-foreground">Automated consensus and driver models</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {analysis.isMock && (
              <span className="text-[10px] bg-muted border text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                Demo Mode
              </span>
            )}
            <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider", consensusTone)}>
              {consensusIcon}
              {analysis.consensus}
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-muted/40 p-4 rounded-xl border">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Overview</h3>
          <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Bull vs Bear Cases */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Bull Case */}
          <div className="rounded-xl border bg-emerald-500/5 dark:bg-emerald-500/2 border-emerald-500/10 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <ArrowUpRight className="h-4 w-4" />
              The Bull Case
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-foreground">
              {analysis.bullCase.map((item, idx) => (
                <li key={idx} className="flex gap-2 items-start">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bear Case */}
          <div className="rounded-xl border bg-red-500/5 dark:bg-red-500/2 border-red-500/10 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold text-xs uppercase tracking-wider">
              <ArrowDownRight className="h-4 w-4" />
              The Bear Case
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-foreground">
              {analysis.bearCase.map((item, idx) => (
                <li key={idx} className="flex gap-2 items-start">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Conversational Assistant */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Ask Follow-up Questions
          </h3>

          <div className="flex flex-col h-[200px] border rounded-xl bg-muted/20 overflow-y-auto p-3 space-y-2.5">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-normal",
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground self-end rounded-tr-none"
                    : "bg-card border text-foreground self-start rounded-tl-none"
                )}
              >
                {msg.text}
              </div>
            ))}
            {sending && (
              <div className="bg-card border text-foreground self-start rounded-tl-none rounded-2xl px-3 py-2 text-xs flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask about ${symbol}'s valuation, margins, risks...`}
              disabled={sending}
              className="flex-1 bg-background border rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
