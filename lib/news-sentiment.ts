import type { NewsArticle } from "./market/types";

export type NewsSentiment = "all" | "bullish" | "bearish" | "neutral" | "unavailable";

type SentimentArticle = Pick<NewsArticle, "headline" | "summary">;

const BULLISH_TERMS = [
  "beat",
  "beats",
  "gain",
  "gains",
  "growth",
  "higher",
  "jump",
  "jumps",
  "rally",
  "record",
  "surge",
  "upgraded",
];

const BEARISH_TERMS = [
  "cut",
  "decline",
  "downgrade",
  "fall",
  "falls",
  "fades",
  "loss",
  "miss",
  "plunge",
  "slump",
  "weak",
  "warning",
];

function countTerms(text: string, terms: string[]) {
  return terms.reduce((score, term) => {
    const pattern = new RegExp(`\\b${term}\\b`, "gi");
    return score + (text.match(pattern)?.length ?? 0);
  }, 0);
}

export function classifyNewsSentiment(
  article: SentimentArticle
): Exclude<NewsSentiment, "all"> {
  const text = `${article.headline ?? ""} ${article.summary ?? ""}`.trim();
  if (!text) {
    return "unavailable";
  }

  const bullish = countTerms(text, BULLISH_TERMS);
  const bearish = countTerms(text, BEARISH_TERMS);

  if (bullish > 0 && bearish > 0) {
    return "neutral";
  }
  if (bullish > bearish) {
    return "bullish";
  }
  if (bearish > bullish) {
    return "bearish";
  }
  return "neutral";
}

export function filterNewsBySentiment<T extends SentimentArticle>(
  articles: T[],
  sentiment: NewsSentiment
): T[] {
  if (sentiment === "all") {
    return articles;
  }
  return articles.filter((article) => classifyNewsSentiment(article) === sentiment);
}

export function getSentimentCounts(articles: SentimentArticle[]) {
  return articles.reduce(
    (counts, article) => {
      counts[classifyNewsSentiment(article)] += 1;
      counts.all += 1;
      return counts;
    },
    {
      all: 0,
      bullish: 0,
      bearish: 0,
      neutral: 0,
      unavailable: 0,
    }
  );
}

export function normalizeNewsSentiment(value: string | string[] | undefined) {
  const sentiment = Array.isArray(value) ? value[0] : value;
  if (
    sentiment === "bullish" ||
    sentiment === "bearish" ||
    sentiment === "neutral" ||
    sentiment === "unavailable"
  ) {
    return sentiment;
  }
  return "all";
}
