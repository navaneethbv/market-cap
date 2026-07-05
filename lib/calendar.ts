export interface MarketHoliday {
  name: string;
  date: string;
}

export interface RawEarningsEvent {
  symbol?: string;
  date?: string;
  hour?: string;
  epsEstimate?: number | null;
}

export interface EarningsRow {
  symbol: string;
  date: string;
  session: string;
  epsEstimate: number | null;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fixedDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function observedDate(date: Date) {
  const day = date.getUTCDay();
  if (day === 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  if (day === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date;
}

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  nth: number
) {
  const date = fixedDate(year, monthIndex, 1);
  const offset = (weekday - date.getUTCDay() + 7) % 7;
  date.setUTCDate(1 + offset + (nth - 1) * 7);
  return date;
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number) {
  const date = fixedDate(year, monthIndex + 1, 0);
  const offset = (date.getUTCDay() - weekday + 7) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date;
}

function getEasterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return fixedDate(year, month - 1, day);
}

export function getMarketHolidays(year: number): MarketHoliday[] {
  const goodFriday = getEasterDate(year);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);

  return [
    ["New Year's Day", observedDate(fixedDate(year, 0, 1))],
    ["Martin Luther King Jr. Day", nthWeekdayOfMonth(year, 0, 1, 3)],
    ["Presidents Day", nthWeekdayOfMonth(year, 1, 1, 3)],
    ["Good Friday", goodFriday],
    ["Memorial Day", lastWeekdayOfMonth(year, 4, 1)],
    ["Juneteenth", observedDate(fixedDate(year, 5, 19))],
    ["Independence Day", observedDate(fixedDate(year, 6, 4))],
    ["Labor Day", nthWeekdayOfMonth(year, 8, 1, 1)],
    ["Thanksgiving Day", nthWeekdayOfMonth(year, 10, 4, 4)],
    ["Christmas Day", observedDate(fixedDate(year, 11, 25))],
  ]
    .map(([name, date]) => ({
      name: String(name),
      date: toIsoDate(date as Date),
    }))
    .filter((holiday) => holiday.date.startsWith(String(year)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getNextMarketEvents(
  today: string,
  holidays: MarketHoliday[],
  limit = 6
) {
  return holidays
    .filter((holiday) => holiday.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function buildEarningsRows(events: RawEarningsEvent[]): EarningsRow[] {
  return events
    .filter((event) => event.symbol && event.date)
    .map((event) => ({
      symbol: event.symbol!.trim().toUpperCase(),
      date: event.date!,
      session:
        event.hour === "bmo"
          ? "Before open"
          : event.hour === "amc"
            ? "After close"
            : "Time unavailable",
      epsEstimate:
        typeof event.epsEstimate === "number" ? event.epsEstimate : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol))
    .slice(0, 12);
}
