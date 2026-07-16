import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEarningsRows,
  getMarketHolidays,
  getNextMarketEvents,
} from "./calendar.ts";

test("getMarketHolidays returns major US market closures", () => {
  const holidays = getMarketHolidays(2026);

  assert.ok(holidays.some((holiday) => holiday.name === "New Year's Day"));
  assert.ok(holidays.some((holiday) => holiday.name === "Independence Day"));
  assert.ok(holidays.every((holiday) => holiday.date.startsWith("2026-")));
});

test("getNextMarketEvents filters past holidays", () => {
  const events = getNextMarketEvents("2026-07-05", getMarketHolidays(2026));

  assert.ok(events.length > 0);
  assert.ok(events.every((event) => event.date >= "2026-07-05"));
});

test("buildEarningsRows normalizes provider events", () => {
  assert.deepEqual(
    buildEarningsRows([
      {
        symbol: "aapl",
        date: "2026-07-28",
        hour: "amc",
        epsEstimate: 1.23,
      },
    ]),
    [
      {
        symbol: "AAPL",
        date: "2026-07-28",
        session: "After close",
        epsEstimate: 1.23,
      },
    ]
  );
});

test("observedDate shifts Sunday holidays to Monday", () => {
  // In 2021, Independence Day (July 4) was a Sunday.
  const holidays = getMarketHolidays(2021);
  const indyDay = holidays.find((h) => h.name === "Independence Day");
  assert.ok(indyDay);
  assert.equal(indyDay.date, "2021-07-05"); // Observed Monday
});

test("buildEarningsRows handles various hour configurations and missing epsEstimate", () => {
  const rows = buildEarningsRows([
    {
      symbol: "MSFT",
      date: "2026-07-29",
      hour: "bmo",
      epsEstimate: 2.34,
    },
    {
      symbol: "NVDA",
      date: "2026-08-15",
      hour: "other",
      epsEstimate: undefined,
    },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].symbol, "MSFT");
  assert.equal(rows[0].session, "Before open");
  
  assert.equal(rows[1].symbol, "NVDA");
  assert.equal(rows[1].session, "Time unavailable");
  assert.equal(rows[1].epsEstimate, null);
});

