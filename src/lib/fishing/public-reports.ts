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

export type WeeklyReport = {
  posted: string;
  waterF: number | null;
  note: string;
  url: string;
};

export type PublicPulse = {
  /** Month outlook. It does not move a day by itself. */
  prior: string;
  trips: RecentTrip[];
  /** Captain's weekly note. It backs a day only when the water is close. */
  weekly: WeeklyReport | null;
  sources: { name: string; url: string }[];
};

const SCDNR = "https://www.dnr.sc.gov/news/saltpiers.html";
const FORUM = "https://forum.charlestonfishing.com";
const SHOP = "https://haddrellspoint.com/fishing-tips/";
const CFR = "https://charlestonfishingreport.com";
const AHQ = "https://www.anglersheadquarters.com/blogs/ahq-report.atom";
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
  const weekly = weeklyBacks(pulse, day);
  if (!match) {
    return {
      ...base,
      grade: "Fair",
      window: null,
      summary: weekly
        ? `${weekly.note} Harbor water is close, so the weekly note backs this day. It does not set the tide, and the catch log is not in this score.`
        : "No report from the last several days was fished in wind, water, and tide like this day. The monthly outlook and an older weekly note do not score the day.",
    };
  }
  const start = Math.max(0, match.minutes - 90);
  return {
    ...base,
    grade: "Good",
    window: `${formatClock(start)}–${formatClock(start + 180)}`,
    summary: `A report from ${formatPrettyDate(match.date)} was fished in wind, water, and tide like this day. The catch log is not in this score.`,
  };
}

export function applyReports(advice: Advice, pulse: PublicPulse | null, day: Conditions | null): Advice {
  if (!pulse || !day) {
    return {
      ...advice,
      lede: `${advice.lede} ${pulse ? "No forecast loaded, so a recent local report can't be matched to this day." : "Local reports didn't load, so this is the catch log and the forecast only."}`.trim(),
    };
  }
  const match = pulse.trips.find((trip) => sameWater(day, trip));
  const weekly = weeklyBacks(pulse, day);
  if (!match) {
    if (!weekly) return advice;
    return {
      ...advice,
      lede: `${advice.lede} ${weekly.note} Harbor water is close to that report, so it backs the call. It does not pick the tide.`.trim(),
      confidence: advice.confidence === "low" ? "medium" : advice.confidence,
      confidenceWhy: `${advice.confidenceWhy} Angler's Headquarters this week matches the water.`.trim(),
    };
  }
  const extra = weekly ? ` ${weekly.note}` : "";
  return {
    ...advice,
    lede: `${advice.lede} A local report from ${formatPrettyDate(match.date)} was fished in wind, water, and tide like this day, so it backs the call. The monthly outlook stays in the background.${extra}`.trim(),
    confidence: advice.confidence === "low" ? "medium" : advice.confidence,
    confidenceWhy: `${advice.confidenceWhy} A report from the last several days matches this wind, water, and tide.`.trim(),
  };
}

export function withPublicReports(outlook: BiteOutlook, pulse: PublicPulse | null, day: Conditions | null): BiteOutlook {
  if (!pulse || outlook.grade === "Stay ashore") return outlook;
  const match = day ? pulse.trips.find((trip) => sameWater(day, trip)) : undefined;
  const weekly = weeklyBacks(pulse, day);
  if (!match || outlook.grade === "Hot") {
    const held = match
      ? `A report from ${formatPrettyDate(match.date)} was fished in wind, water, and tide like this day. The catch log already has it at Hot.`
      : weekly
        ? `${weekly.note} Harbor water is close, so the weekly note backs this day without moving the grade.`
        : "No report from the last several days was fished in wind, water, and tide like this day.";
    return { ...outlook, summary: `${outlook.summary} ${held}` };
  }
  return {
    ...outlook,
    grade: step(outlook.grade, 1),
    summary: `${outlook.summary} A report from ${formatPrettyDate(match.date)} was fished in wind, water, and tide like this day, so it moves one step.`,
  };
}

async function loadPulse(): Promise<PublicPulse> {
  const [scdnr, notes, shop, daily, weekly] = await Promise.all([
    readScdnr(),
    readForum(),
    readShop(),
    readCharlestonReport(),
    readAhq(),
  ]);
  const trips = await recentTrips([...notes, ...daily]);
  return {
    prior: priorLine(scdnr, shop, weekly),
    trips,
    weekly,
    sources: [
      { name: "Charleston Fishing Report", url: `${CFR}/reports` },
      { name: "Haddrell's Point", url: SHOP },
      { name: "SCDNR trends", url: SCDNR },
      { name: "Charleston Fishing", url: `${FORUM}/c/inshore-reports/58` },
      { name: "Angler's Headquarters", url: weekly?.url ?? "https://www.anglersheadquarters.com/blogs/ahq-report" },
    ],
  };
}

export function matchingReport(pulse: PublicPulse | null, day: Conditions | null): RecentTrip | null {
  if (!pulse || !day) return null;
  return pulse.trips.find((trip) => sameWater(day, trip)) ?? null;
}

function priorLine(scdnr: string, shop: string, weekly: WeeklyReport | null): string {
  const month = /live shrimp/i.test(scdnr) && /mud minnow/i.test(scdnr);
  const official = month
    ? "SCDNR's Charleston note is a month outlook: trout and redfish excellent through the month, live shrimp early, then mud minnows."
    : "SCDNR's Charleston note is a month outlook, not a call for one day.";
  return [official, shop, weekly?.note ?? ""].filter(Boolean).join(" ");
}

function weeklyBacks(pulse: PublicPulse | null, day: Conditions | null): WeeklyReport | null {
  const weekly = pulse?.weekly;
  if (!weekly || !day || weekly.waterF == null) return null;
  const age = calendarDiff(weekly.posted, todayInCharleston());
  if (age < 0 || age > RECENT_DAYS) return null;
  if (Math.abs(day.waterF - weekly.waterF) > 6) return null;
  return weekly;
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

async function readCharlestonReport(): Promise<{ text: string; posted: string }[]> {
  try {
    const page = await fetch(`${CFR}/reports`, { signal: AbortSignal.timeout(12000) }).then((res) => res.text());
    const index = page.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
    if (!index) return [];
    const bundle = await fetch(`${CFR}${index}`, { signal: AbortSignal.timeout(12000) }).then((res) => res.text());
    const chunk = bundle.match(/\.\/reports-[A-Za-z0-9_-]+\.js/)?.[0];
    if (!chunk) return [];
    const js = await fetch(`${CFR}/assets/${chunk.slice(2)}`, { signal: AbortSignal.timeout(12000) }).then((res) => res.text());
    const found: { text: string; posted: string }[] = [];
    const pattern = /\{id:`(\d{4}-\d{2}-\d{2})`,date:`(\d{4}-\d{2}-\d{2})`,title:`([^`]*)`,summary:`([^`]*)`/g;
    for (const match of js.matchAll(pattern)) {
      found.push({ posted: match[2], text: `${match[3]}. ${match[4]}` });
      if (found.length >= 7) break;
    }
    return found.filter((note) => note.posted && note.text.length > 8);
  } catch {
    return [];
  }
}

async function readAhq(): Promise<WeeklyReport | null> {
  try {
    const xml = await fetch(AHQ, { signal: AbortSignal.timeout(15000) }).then((res) => res.text());
    const entry = xml.split("<entry>").slice(1).find((part) => /Charleston \(SC\)/.test(part));
    if (!entry) return null;
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] ?? "";
    const posted = postedOn(published);
    const href =
      entry.match(/href="(https:\/\/www\.anglersheadquarters\.com\/blogs\/ahq-report\/[^"]+)"/)?.[1] ??
      "https://www.anglersheadquarters.com/blogs/ahq-report";
    const raw = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? "";
    const text = strip(decodeXml(raw));
    const parts = text.split(/Morning surface water temperatures/i);
    const current = `${parts[0] ?? ""} Morning surface water temperatures ${parts[1] ?? ""}`.slice(0, 1600);
    const water = current.match(/water temperatures are around (\d{2})(?:\s*-\s*(\d{2}))?/i);
    const waterF = water ? Math.round((Number(water[1]) + Number(water[2] || water[1])) / 2) : null;
    if (!posted) return null;
    return { posted, waterF, note: ahqNote(current, waterF), url: href };
  } catch {
    return null;
  }
}

function ahqNote(text: string, waterF: number | null): string {
  const species = ["trout", "redfish", "flounder", "sheepshead", "black drum"].filter((name) => {
    if (name === "redfish") return /redfish|red drum/i.test(text);
    return new RegExp(name, "i").test(text);
  });
  const baits = [
    [/live shrimp/i, "live shrimp"],
    [/finger mullet/i, "finger mullet"],
    [/mud minnow/i, "mud minnows"],
    [/crab/i, "crab"],
    [/grub|artificial|paddletail|vudu|doa/i, "artificials"],
  ]
    .filter(([pattern]) => (pattern as RegExp).test(text))
    .map(([, name]) => name as string);
  const tide = /low tide has been the best/i.test(text) ? " Low tide has been the better stage." : "";
  const water = waterF != null ? ` Harbor water about ${waterF}°F.` : "";
  const fish = species.length ? species.slice(0, 3).join(", ") : "inshore fish";
  const bait = baits.length ? ` on ${baits.slice(0, 3).join(", ")}` : "";
  return `Angler's Headquarters this week: ${fish}${bait}.${water}${tide}`.replace(/\s+/g, " ").trim();
}

function decodeXml(value: string): string {
  return value
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&/g, "&")
    .replace(/&#39;|'/g, "'")
    .replace(/"/g, '"');
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
