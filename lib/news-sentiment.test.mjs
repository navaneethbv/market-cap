import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyNewsSentiment,
  filterNewsBySentiment,
  getSentimentCounts,
  normalizeNewsSentiment,
} from "./news-sentiment.ts";

const article = (headline, summary = "") => ({ headline, summary });

test("classifyNewsSentiment labels bullish and bearish stories", () => {
  assert.equal(
    classifyNewsSentiment(article("Stocks rally after earnings beat")),
    "bullish"
  );
  assert.equal(
    classifyNewsSentiment(article("Shares fall after weak guidance")),
    "bearish"
  );
});

test("classifyNewsSentiment handles neutral and mixed stories", () => {
  assert.equal(
    classifyNewsSentiment(article("Markets mixed as investors wait")),
    "neutral"
  );
  assert.equal(
    classifyNewsSentiment(article("Stock rally fades after weak forecast")),
    "neutral"
  );
});

test("classifyNewsSentiment marks empty stories unavailable", () => {
  assert.equal(classifyNewsSentiment(article("", "")), "unavailable");
});

test("filterNewsBySentiment and getSentimentCounts summarize articles", () => {
  const articles = [
    article("Stocks rally"),
    article("Shares fall"),
    article("Markets mixed"),
  ];

  assert.equal(filterNewsBySentiment(articles, "all").length, 3);
  assert.equal(filterNewsBySentiment(articles, "bullish").length, 1);
  assert.deepEqual(getSentimentCounts(articles), {
    all: 3,
    bullish: 1,
    bearish: 1,
    neutral: 1,
    unavailable: 0,
  });
});

test("normalizeNewsSentiment parses and defaults inputs", () => {
  assert.equal(normalizeNewsSentiment("bullish"), "bullish");
  assert.equal(normalizeNewsSentiment(["bearish"]), "bearish");
  assert.equal(normalizeNewsSentiment(undefined), "all");
  assert.equal(normalizeNewsSentiment("invalid-sentiment"), "all");
});
