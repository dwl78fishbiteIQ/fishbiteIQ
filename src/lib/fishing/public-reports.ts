import { createServerFn } from "@tanstack/react-start";
import { loadConditions } from "@/lib/fishing/conditions";
import { stageFromStation } from "@/lib/fishing/station";
import { addDays, calendarDiff, degToWind, formatClock, formatPrettyDate, monthOf, todayInCharleston, windClose } from "@/lib/fishing/time";
import type { BiteOutlook } from "@/lib/fishing/advisor";
import type { Advice, Conditions, TideStage, WindDir } from "@/lib/fishing/types";

export type RecentTrip = {
  date: string;
  label: string;
  windMph: number | null;
  windDir: WindDir | null;
  airF: number | null;
  waterF: number | null;
  tideStage: TideStage | null;
  minutes: number;
};

export type PublicPulse = {
  /** Month outlook. It does not move a day by itself. */
  prior: string;
  trips: RecentTrip[];
  sources: { name: string; url: string }[];
};

const SCDNR = "https://www.dnr.sc.gov/news/saltpiers.html";
const FORUM = "https://forum.charlestonfishing.com";
const SHOP = "https://haddrellspoint.com/fishing-tips/";
const RECENT_DAYS = 7;
const cache = { at: 0, value: null as PublicPulse | null };
const TTL = 30 * 60 * 1000;

export async function loadPublicReports(): Promise<PublicPulse | null> {
  try {
    return await loadPulse();
  } catch {
    return null;
  }
}

export const getPublicReports = createServerFn({ method: "GET" }).handler(async (): Promise<PublicPulse | null> => {
  if (cache.value && Date.now() - cache.at < TTL) return cache.value;
  try {
    const value = await loadPulse();
    cache.at = Date.now();
    cache.value = value;
    return value;
  } catch {
    return cache.value;
  }
});

export function publicOnlyOutlook(base: BiteOutlook, pulse: PublicPulse | null, day: Conditions | null): BiteOutlook {
  if (base.grade === "Stay ashore") return base;
  if (!pulse) {
    return {
      ...base,
      grade: "Fair",
      window: null,
      summary: "Public reports didn't load. This is only the tide and the forecast.",
    };
  }
  const match = day ? pulse.trips.find((trip) => sameWater(day, trip)) : undefined;
  if (!match) {
    return {
      ...base,
      grade: "Fair",
      window: null,
      summary: `${pulse.prior} No report from the last several days was fished in wind, water, and tide like this day.`,
    };
  }
  const start = Math.max(0, match.minutes - 90);
  return {
    ...base,
    grade: "Good",
    window: `${formatClock(start)}–${formatClock(start + 180)}`,
    summary: `${pulse.prior} A report from ${formatPrettyDate(match.date)} was fished in wind, water, and tide like this day. The catch log is not in this score.`,
  };
}

export function applyReports(advice: Advice, pulse: PublicPulse | null, day: Conditions | null): Advice {
  const match = pulse && day ? pulse.trips.find((trip) => sameWater(day, trip)) : undefined;
  const line = !pulse
    ? "Public fishing reports didn't load, so this projection is the catch log and the forecast only."
    : !day
      ? `${pulse.prior} No forecast loaded, so a recent report can't be matched to this day.`
      : match
        ? `${pulse.prior} A report from ${formatPrettyDate(match.date)} was fished in wind, water, and tide like this day, so it supports the projection.`
        : `${pulse.prior} No report from the last several days was fished in wind, water, and tide like this day, so the reports don't move the call.`;
  return {
    ...advice,
    lede: `${advice.lede} ${line}`.trim(),
    confidenceWhy: match
      ? `${advice.confidenceWhy} A report from the last several days matches this wind, water, and tide.`
      : advice.confidenceWhy,
  };
}

export function withPublicReports(outlook: BiteOutlook, pulse: PublicPulse | null, day: Conditions | null): BiteOutlook {
  if (!pulse || outlook.grade === "Stay ashore") return outlook;
  const match = day ? pulse.trips.find((trip) => sameWater(day, trip)) : undefined;
  if (!match || outlook.grade === "Hot") {
    const held = match
      ? `A report from ${formatPrettyDate(match.date)} was fished in wind, water, and tide like this day. The catch log already has it at Hot.`
      : "No report from the last several days was fished in wind, water, and tide like this day.";
    return { ...outlook, summary: `${outlook.summary} ${pulse.prior} ${held}` };
  }
  return {
    ...outlook,
    grade: step(outlook.grade, 1),
    summary: `${outlook.summary} ${pulse.prior} A report from ${formatPrettyDate(match.date)} was fished in wind, water, and tide like this day, so it moves one step.`,
  };
}

async function loadPulse(): Promise<PublicPulse> {
  const [scdnr, notes, shop] = await Promise.all([readScdnr(), readForum(), readShop()]);
  const trips = await recentTrips(notes);
  return {
    prior: priorLine(scdnr, shop),
    trips,
    sources: [
      { name: "Haddrell's Point", url: SHOP },
      { name: "SCDNR trends", url: SCDNR },
      { name: "Charleston Fishing", url: `${FORUM}/c/inshore-reports/58` },
    ],
  };
}

function priorLine(scdnr: string, shop: string): string {
  const month = /live shrimp/i.test(scdnr) && /mud minnow/i.test(scdnr);
  const official = month
    ? "SCDNR's Charleston note is a month outlook: trout and redfish excellent through the month, live shrimp early, then mud minnows."
    : "SCDNR's Charleston note is a month outlook, not a call for one day.";
  return shop ? `${official} ${shop}` : official;
}

function sameWater(day: Conditions, trip: RecentTrip): boolean {
  const now = sample(day, trip.minutes);
  if (!now || trip.windMph == null || trip.windDir == null || trip.airF == null || trip.waterF == null || trip.tideStage == null) return false;
  if (now.windMph == null || now.windDir == null || now.airF == null || now.tideStage == null) return false;
  if (Math.abs(now.windMph - trip.windMph) > 8) return false;
  if ((now.windMph >= 18 && trip.windMph < 12) || (trip.windMph >= 18 && now.windMph < 12)) return false;
  if (!windClose(now.windDir, trip.windDir)) return false;
  if (Math.abs(now.airF - trip.airF) > 8) return false;
  if (Math.abs(day.waterF - trip.waterF) > 6) return false;
  return now.tideStage === trip.tideStage;
}

function sample(
  day: Conditions,
  minutes: number,
): { windMph: number | null; windDir: WindDir | null; airF: number | null; tideStage: TideStage | null } | null {
  if (!day.hourly.length) return null;
  const hour = day.hourly.reduce((best, point) => (Math.abs(point.at - minutes) < Math.abs(best.at - minutes) ? point : best));
  return {
    windMph: hour.windMph,
    windDir: hour.windDeg == null ? null : (degToWind(hour.windDeg) as WindDir),
    airF: hour.airF,
    tideStage: stageFromStation(day.tides, minutes),
  };
}

async function recentTrips(notes: { text: string; posted: string }[]): Promise<RecentTrip[]> {
  const today = todayInCharleston();
  const wanted = new Map<string, { label: string; minutes: number }>();
  for (const note of notes) {
    const minutes = hourHint(note.text);
    for (const date of datesInPost(note.text, note.posted)) {
      const age = calendarDiff(date, today);
      if (age < 0 || age > RECENT_DAYS) continue;
      if (!wanted.has(date)) wanted.set(date, { label: note.text.slice(0, 80), minutes });
    }
  }
  const trips: RecentTrip[] = [];
  for (const [date, meta] of wanted) {
    try {
      const conditions = await loadConditions(date);
      const snap = sample(conditions, meta.minutes);
      if (!snap) continue;
      trips.push({
        date,
        label: meta.label,
        windMph: snap.windMph,
        windDir: snap.windDir,
        airF: snap.airF,
        waterF: conditions.waterF,
        tideStage: snap.tideStage,
        minutes: meta.minutes,
      });
    } catch {
      continue;
    }
  }
  return trips;
}

function hourHint(text: string): number {
  if (/\bafternoon\b/i.test(text)) return 14 * 60;
  if (/\b(evening|sunset)\b/i.test(text)) return 17 * 60;
  return 8 * 60;
}

function datesInPost(text: string, posted: string): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  const postedDay = new Date(`${posted}T00:00:00Z`).getUTCDay();
  if (/\byesterday\b/.test(lower)) found.add(addDays(posted, -1));
  const names: Array<[RegExp, number]> = [
    [/\b(sunday|sun)\b/, 0],
    [/\b(monday|mon)\b/, 1],
    [/\b(tuesday|tue)\b/, 2],
    [/\b(wednesday|wed)\b/, 3],
    [/\b(thursday|thur|thu)\b/, 4],
    [/\b(friday|fri)\b/, 5],
    [/\b(saturday|sat)\b/, 6],
  ];
  for (const [pattern, weekday] of names) {
    if (!pattern.test(lower)) continue;
    const delta = (postedDay - weekday + 7) % 7;
    found.add(addDays(posted, -delta));
  }
  if (!found.size) found.add(posted);
  return [...found];
}

async function readShop(): Promise<string> {
  try {
    const html = await fetch(SHOP, { signal: AbortSignal.timeout(12000) }).then((res) => res.text());
    const text = strip(html);
    const month = monthOf(todayInCharleston());
    const marker = month === 12 || month <= 3 ? "December" : month <= 6 ? "April" : month <= 9 ? "July" : "October-December";
    const start = text.indexOf(marker);
    if (start < 0) return "";
    const nextMarker =
      marker === "October-December" ? "Other Factors" : month <= 3 || month === 12 ? "April" : month <= 6 ? "July" : "October";
    const next = text.indexOf(nextMarker, start + marker.length);
    const section = text.slice(start, next > start ? next : start + 500);
    if (/artificial/i.test(section)) {
      return "Haddrell's Point says artificials are the move this season, with bull reds at the jetties.";
    }
    return "Haddrell's Point inshore tips match this part of the year.";
  } catch {
    return "";
  }
}

async function readScdnr(): Promise<string> {
  const html = await fetch(SCDNR, { signal: AbortSignal.timeout(12000) }).then((res) => res.text());
  const text = strip(html);
  const start = text.search(/\bCharleston\b/);
  if (start < 0) return "";
  const end = text.indexOf("Edisto", start + 12);
  return text.slice(start, end > start ? end : start + 1400);
}

async function readForum(): Promise<{ text: string; posted: string }[]> {
  const list = (await fetch(`${FORUM}/c/58.json`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  }).then((res) => res.json())) as { topic_list?: { topics?: { id: number; title: string; created_at?: string }[] } };
  const topics = (list.topic_list?.topics ?? []).filter((topic) => topic.id !== 11502).slice(0, 5);
  const posts = await Promise.all(
    topics.map(async (topic) => {
      const body = (await fetch(`${FORUM}/t/${topic.id}.json`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      }).then((res) => res.json())) as { post_stream?: { posts?: { cooked?: string; created_at?: string }[] } };
      const post = body.post_stream?.posts?.[0];
      const posted = postedOn(post?.created_at ?? topic.created_at ?? "");
      return { text: `${topic.title}. ${strip(post?.cooked ?? "")}`, posted };
    }),
  );
  return posts.filter((post) => post.posted && post.text.length > 8);
}

function postedOn(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&/g, "&")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function step(grade: BiteOutlook["grade"], delta: number): BiteOutlook["grade"] {
  const ladder = ["Slow", "Fair", "Good", "Hot"] as const;
  const index = ladder.indexOf(grade as (typeof ladder)[number]);
  if (index < 0) return grade;
  return ladder[Math.max(0, Math.min(ladder.length - 1, index + delta))];
}
