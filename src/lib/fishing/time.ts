import type { WindDir } from "@/lib/fishing/types";
import { WIND_DIRS } from "@/lib/fishing/types";

export function todayInCharleston(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function nowMinutesInCharleston(now = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function calendarDiff(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function monthOf(iso: string): number {
  return Number(iso.slice(5, 7));
}

export function formatPrettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
}

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dt);
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatClock(minutes: number): string {
  const day = Math.floor(minutes / 1440);
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  const core = `${hr}:${String(min).padStart(2, "0")} ${ap}`;
  if (day > 0) return `${core} (next day)`;
  return core;
}

export function formatRange(start: number, end: number): string {
  return `${formatClock(start)}–${formatClock(end)}`;
}

export function clockToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function degToWind(deg: number): WindDir {
  const idx = Math.round(deg / 45) % 8;
  return WIND_DIRS[idx] ?? "N";
}

export function windClose(a: WindDir | "", b: WindDir | null): boolean {
  if (!a || !b) return false;
  const ia = WIND_DIRS.indexOf(a);
  const ib = WIND_DIRS.indexOf(b);
  const d = Math.min(Math.abs(ia - ib), 8 - Math.abs(ia - ib));
  return d <= 1;
}

export function nextWeekday(todayIso: string, targetDow: number): string {
  const [y, m, d] = todayIso.split("-").map(Number);
  const current = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const delta = (targetDow - current + 7) % 7;
  return addDays(todayIso, delta);
}

export function weatherLabel(code: number | null): string {
  if (code == null) return "Forecast not in yet";
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Wintry mix";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorms";
}

export function isStormCode(code: number | null): boolean {
  return code != null && code >= 95;
}

const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function parseDatePhrase(text: string, today: string): string | null {
  if (/\btoday\b/i.test(text)) return today;
  if (/\btomorrow\b/i.test(text)) return addDays(today, 1);
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) return monthDayDate(today, Number(slash[1]), Number(slash[2]), slash[3]);
  const monthDay = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b/i,
  );
  if (monthDay) return monthDayDate(today, monthIndex(monthDay[1]), Number(monthDay[2]), monthDay[3]);
  const theDay = text.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i);
  if (theDay) return dayThisOrNextMonth(today, Number(theDay[1]));
  if (/\bweekend\b/i.test(text)) return nextWeekday(today, 6);
  for (let i = 0; i < WEEKDAY_NAMES.length; i += 1) {
    const re = new RegExp(`\\b${WEEKDAY_NAMES[i]}\\b`, "i");
    if (!re.test(text)) continue;
    const day = nextWeekday(today, i);
    if (/\bnext\b/i.test(text) && day === today) return addDays(today, 7);
    return day;
  }
  return null;
}

export function parseClockPhrase(text: string): string | null {
  if (/\b(dawn|sunrise|daybreak)\b/i.test(text)) return "06:30";
  if (/\b(dusk|sunset)\b/i.test(text)) return "17:30";
  const ampm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (ampm) return clock24(Number(ampm[1]), Number(ampm[2] ?? "0"), /p/i.test(ampm[3]));
  const around = text.match(/\b(?:at|around|about)\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (!around) return null;
  let hour = Number(around[1]);
  const minute = Number(around[2] ?? "0");
  if (hour > 12 || hour < 1 || minute > 59) return null;
  const evening = /\b(evening|night|tonight|afternoon|pm)\b/i.test(text);
  const morning = /\b(morning|dawn|am)\b/i.test(text);
  if (!morning && (evening || hour === 12)) hour = hour === 12 ? 12 : hour + 12;
  else if (!morning && !evening && hour <= 4) hour += 12;
  return clock24(hour > 12 ? hour - 12 : hour, minute, hour >= 12);
}

function clock24(hour: number, minute: number, pm: boolean): string | null {
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  let h = hour % 12;
  if (pm) h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function monthIndex(name: string): number {
  const key = name.slice(0, 3).toLowerCase();
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return months.indexOf(key) + 1;
}

function monthDayDate(today: string, month: number, day: number, yearRaw?: string): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let year = yearRaw ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw) : Number(today.slice(0, 4));
  let iso = isoDate(year, month, day);
  if (!iso) return null;
  if (!yearRaw && iso < today) {
    year += 1;
    iso = isoDate(year, month, day);
  }
  return iso;
}

function dayThisOrNextMonth(today: string, day: number): string | null {
  if (day < 1 || day > 31) return null;
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const thisMonth = isoDate(year, month, day);
  if (thisMonth && thisMonth >= today) return thisMonth;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return isoDate(nextYear, nextMonth, day);
}

function isoDate(year: number, month: number, day: number): string | null {
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return dt.toISOString().slice(0, 10);
}

export function parseMonthPhrase(text: string): number | null {
  for (let i = 0; i < MONTHS.length; i += 1) {
    const full = MONTHS[i];
    const short = full.slice(0, 3);
    const re = new RegExp(`\\b(${full}|${short})\\b`, "i");
    if (re.test(text)) return i + 1;
  }
  return null;
}
