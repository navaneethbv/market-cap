import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getQuote,
  searchSymbols,
  getProfile,
  getKeyMetrics,
  getCompanyNews,
  getMarketNews,
  getEarningsCalendar,
  getInsiderTransactions,
} from "./finnhub.ts";

test("getQuote fetches and returns quote successfully", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;

  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async (url) => {
    assert.match(url, /finnhub\.io\/api\/v1\/quote/);
    return new Response(
      JSON.stringify({
        c: 180.5,
        d: 2.5,
        dp: 1.4,
        h: 181.0,
        l: 178.0,
        o: 179.0,
        pc: 178.0,
        t: 1760000000,
      }),
      { status: 200 }
    );
  };

  try {
    const quote = await getQuote("AAPL");
    assert.equal(quote.price, 180.5);
    assert.equal(quote.change, 2.5);
    assert.equal(quote.changePercent, 1.4);
    assert.equal(quote.symbol, "AAPL");
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("searchSymbols maps stock search queries correctly", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async (url) => {
    assert.match(url, /finnhub\.io\/api\/v1\/search/);
    return new Response(
      JSON.stringify({
        result: [
          { symbol: "AAPL", description: "Apple Inc.", type: "Common Stock" },
          { symbol: "MSFT", description: "Microsoft Corp.", type: "Common Stock" },
          { symbol: "INVALID", description: "Options dummy", type: "Option" },
        ],
      }),
      { status: 200 }
    );
  };

  try {
    const results = await searchSymbols("APP");
    assert.equal(results.length, 2);
    assert.equal(results[0].symbol, "AAPL");
    assert.equal(results[1].symbol, "MSFT");
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getProfile parses basic stock descriptive metrics", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async (url) => {
    assert.match(url, /finnhub\.io\/api\/v1\/stock\/profile2/);
    return new Response(
      JSON.stringify({
        name: "Coca-Cola Co.",
        ticker: "KO",
        exchange: "NYSE",
        finnhubIndustry: "Beverages",
        logo: "logo-ko.png",
        marketCapitalization: 260000,
      }),
      { status: 200 }
    );
  };

  try {
    const profile = await getProfile("KO");
    assert.equal(profile.name, "Coca-Cola Co.");
    assert.equal(profile.industry, "Beverages");
    assert.equal(profile.marketCap, 260000);
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getKeyMetrics normalizes finnhub key fields", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async (url) => {
    assert.match(url, /finnhub\.io\/api\/v1\/stock\/metric/);
    return new Response(
      JSON.stringify({
        metric: {
          "52WeekHigh": 190.5,
          "52WeekLow": 130.2,
          peBasicExclExtraTTM: 25.4,
          beta: 1.05,
          dividendYieldIndicatedAnnual: 2.1,
          epsBasicExclExtraItemsTTM: 6.2,
        },
      }),
      { status: 200 }
    );
  };

  try {
    const metrics = await getKeyMetrics("AAPL");
    assert.equal(metrics.high52, 190.5);
    assert.equal(metrics.peRatio, 25.4);
    assert.equal(metrics.beta, 1.05);
    assert.equal(metrics.dividendYield, 2.1);
    assert.equal(metrics.epsTTM, 6.2);
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getCompanyNews and getMarketNews filters news indices", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify([
        { id: 1, headline: "Headline 1", summary: "Summary 1", datetime: 1760000000 },
        { id: 2, headline: "Headline 2", summary: "Summary 2", datetime: 1760000100 },
      ]),
      { status: 200 }
    );
  };

  try {
    const companyNews = await getCompanyNews("AAPL");
    assert.equal(companyNews.length, 2);
    assert.equal(companyNews[0].headline, "Headline 1");

    const marketNews = await getMarketNews();
    assert.equal(marketNews.length, 2);
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getEarningsCalendar fetches calendar list correctly", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        earningsCalendar: [
          { symbol: "AAPL", date: "2026-07-30", hour: "amc", epsEstimate: 1.8 },
        ],
      }),
      { status: 200 }
    );
  };

  try {
    const earnings = await getEarningsCalendar("2026-07-01", "2026-08-01");
    assert.equal(earnings.length, 1);
    assert.equal(earnings[0].symbol, "AAPL");
    assert.equal(earnings[0].epsEstimate, 1.8);
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("finnhub throws when FINNHUB_API_KEY is not set", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  delete process.env.FINNHUB_API_KEY;

  try {
    await assert.rejects(
      () => getQuote("AAPL"),
      /FINNHUB_API_KEY is not set/
    );
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
  }
});

test("finnhub throws when fetch returns non-ok response status", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async () => {
    return new Response("Internal Server Error", { status: 500 });
  };

  try {
    await assert.rejects(
      () => getQuote("AAPL"),
      /Finnhub \/quote failed: 500/
    );
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getQuote throws when receiving all-zeros mock-like quote data", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        c: 0,
        d: 0,
        dp: 0,
        h: 0,
        l: 0,
        o: 0,
        pc: 0,
        t: 0,
      }),
      { status: 200 }
    );
  };

  try {
    await assert.rejects(
      () => getQuote("INVALID"),
      /No quote data for symbol INVALID/
    );
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("getInsiderTransactions parses transactions feed correctly", async () => {
  const originalKey = process.env.FINNHUB_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.FINNHUB_API_KEY = "mock-key";

  globalThis.fetch = async (url) => {
    assert.match(url, /finnhub\.io\/api\/v1\/stock\/insider-transactions/);
    return new Response(
      JSON.stringify({
        symbol: "AAPL",
        data: [
          {
            symbol: "AAPL",
            name: "COOK TIMOTHY D",
            share: 1200000,
            change: -50000,
            transactionPrice: 185.5,
            transactionDate: "2026-07-01",
            filingDate: "2026-07-03",
            transactionCode: "S",
            isDirectShare: true,
          },
        ],
      }),
      { status: 200 }
    );
  };

  try {
    const list = await getInsiderTransactions("AAPL");
    assert.equal(list.length, 1);
    assert.equal(list[0].name, "COOK TIMOTHY D");
    assert.equal(list[0].change, -50000);
    assert.equal(list[0].price, 185.5);
    assert.equal(list[0].isDirectShare, true);
  } finally {
    process.env.FINNHUB_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

