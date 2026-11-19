import { createServerFn } from "@tanstack/react-start";
import { WATER_BY_MONTH } from "@/lib/fishing/seasons";
import { calendarDiff, degToWind, isStormCode, monthOf, todayInCharleston, weatherLabel } from "@/lib/fishing/time";
import type { Conditions, ConditionsResult, HourPoint, TideEvent, WindDir } from "@/lib/fishing/types";

const STATION = "8665530";
const NOAA = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

const cache = new Map<string, { at: number; value: Conditions }>();
const TTL = 20 * 60 * 1000;

export const getConditions = createServerFn({ method: "GET" })
  .validator((input: { date: string }) => {
    if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      throw new Error("Pick a valid date.");
    }
    return { date: input.date };
  })
  .handler(async ({ data }): Promise<ConditionsResult> => {
    const hit = cache.get(data.date);
    if (hit && Date.now() - hit.at < TTL) return hit.value;
    try {
      const value = await loadConditions(data.date);
      if (value.ok) cache.set(data.date, { at: Date.now(), value });
      return value;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tide station didn't answer.";
      return { ok: false, date: data.date, message };
    }
  });

export async function loadConditions(date: string): Promise<Conditions> {
  const today = todayInCharleston();
  const start = addCompact(date, -1);
  const end = addCompact(date, 1);

  const [hilo, hourlyTide, weather, marine, water] = await Promise.all([
    fetchJson(noaa({ product: "predictions", interval: "hilo", begin_date: start, end_date: end })),
    fetchJson(noaa({ product: "predictions", interval: "h", begin_date: compact(date), end_date: compact(date) })),
    fetchJson(weatherUrl(date)).catch(() => null),
    fetchJson(marineUrl(date)).catch(() => null),
    fetchJson(noaa({ product: "water_temperature", date: "latest" })).catch(() => null),
  ]);

  const tides = readTides(hilo, date);
  const tideHours = readTideHours(hourlyTide, date);
  const wx = readWeather(weather, date);
  const waves = readWaves(marine, date);
  const hourly = mergeHours(tideHours, wx.hours, waves);

  const daylight = hourly.filter((h) => h.at >= 6 * 60 && h.at < 18 * 60);
  const winds = daylight.map((h) => h.windMph).filter((v): v is number => v != null);
  const airs = daylight.map((h) => h.airF).filter((v): v is number => v != null);
  const prec = daylight.map((h) => h.precipPct).filter((v): v is number => v != null);
  const codes = daylight.map((h) => h.weatherCode).filter((v): v is number => v != null);
  const waveVals = daylight.map((h) => h.waveFt).filter((v): v is number => v != null);
  const windiest = daylight.reduce<HourPoint | null>((best, h) => {
    if (h.windMph == null) return best;
    if (!best || (best.windMph ?? -1) < h.windMph) return h;
    return best;
  }, null);

  const gauge = readWater(water, today);
  const useGauge = gauge != null && Math.abs(calendarDiff(today, date)) <= 1;
  const sky = readSky(weather, date);
  const waterF = useGauge ? Math.round(gauge) : WATER_BY_MONTH[monthOf(date)] ?? 64;
  const code = codes.length ? (codes.some((c) => c >= 95) ? Math.max(...codes) : codes[Math.floor(codes.length / 2)]) : null;

  return {
    ok: true,
    date,
    stationId: STATION,
    stationName: "Charleston, Cooper River Entrance",
    tides,
    hourly,
    daylight: {
      windLow: winds.length ? Math.round(Math.min(...winds)) : null,
      windHigh: winds.length ? Math.round(Math.max(...winds)) : null,
      windDeg: windiest?.windDeg ?? null,
      windDir: windiest?.windDeg == null ? null : (degToWind(windiest.windDeg) as WindDir),
      airHigh: airs.length ? Math.round(Math.max(...airs)) : null,
      airLow: airs.length ? Math.round(Math.min(...airs)) : null,
      precipPct: prec.length ? Math.round(Math.max(...prec)) : null,
      weatherCode: code,
      weatherLabel: weatherLabel(code),
      waveFt: waveVals.length ? Math.max(...waveVals) : null,
      storm: codes.some((c) => isStormCode(c)),
    },
    waterF,
    waterSource: useGauge ? "gauge" : "seasonal",
    weatherKnown: wx.ok,
    pressureHpa: sky.pressureHpa,
    pressureTrend: sky.pressureTrend,
    cloudPct: sky.cloudPct,
    humidity: sky.humidity,
    gustMph: sky.gustMph,
    precip24In: sky.precip24In,
    frontHours: sky.frontHours,
  };
}

function noaa(params: Record<string, string>): string {
  const q = new URLSearchParams({
    station: STATION,
    datum: "MLLW",
    time_zone: "lst_ldt",
    units: "english",
    format: "json",
    ...params,
  });
  return `${NOAA}?${q.toString()}`;
}

function weatherUrl(date: string): string {
  const q = new URLSearchParams({
    latitude: "32.794",
    longitude: "-79.863",
    hourly:
      "temperature_2m,relative_humidity_2m,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,weather_code",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "America/New_York",
    start_date: shiftIso(date, -2),
    end_date: shiftIso(date, 1),
  });
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`;
}

function marineUrl(date: string): string {
  const q = new URLSearchParams({
    latitude: "32.73",
    longitude: "-79.85",
    hourly: "wave_height",
    timezone: "America/New_York",
    start_date: date,
    end_date: date,
  });
  return `https://marine-api.open-meteo.com/v1/marine?${q.toString()}`;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Forecast request failed (${res.status}).`);
  return res.json();
}

function compact(iso: string): string {
  return iso.replaceAll("-", "");
}

function shiftIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function addCompact(iso: string, days: number): string {
  return shiftIso(iso, days).replaceAll("-", "");
}

function atFromStamp(stamp: string, date: string): number | null {
  const day = stamp.slice(0, 10);
  const hm = stamp.includes("T") ? stamp.slice(11, 16) : (stamp.split(" ")[1] ?? "").slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(hm)) return null;
  const [hh, mm] = hm.split(":").map(Number);
  return calendarDiff(date, day) * 1440 + hh * 60 + mm;
}

function readTides(payload: unknown, date: string): TideEvent[] {
  const rows = asPredictions(payload);
  const tides: TideEvent[] = [];
  for (const row of rows) {
    if (row.type !== "H" && row.type !== "L") continue;
    const at = atFromStamp(row.t, date);
    const heightFt = Number(row.v);
    if (at == null || Number.isNaN(heightFt)) continue;
    tides.push({ at, type: row.type, heightFt });
  }
  return tides.sort((a, b) => a.at - b.at);
}

function readTideHours(payload: unknown, date: string): Map<number, number> {
  const map = new Map<number, number>();
  for (const row of asPredictions(payload)) {
    const at = atFromStamp(row.t, date);
    const heightFt = Number(row.v);
    if (at == null || at < 0 || at >= 1440 || Number.isNaN(heightFt)) continue;
    map.set(at, heightFt);
  }
  return map;
}

function asPredictions(payload: unknown): { t: string; v: string; type?: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const body = payload as { predictions?: { t: string; v: string; type?: string }[]; error?: unknown };
  if (body.error || !Array.isArray(body.predictions)) return [];
  return body.predictions;
}

type WxHour = {
  at: number;
  airF: number | null;
  windMph: number | null;
  windDeg: number | null;
  precipPct: number | null;
  weatherCode: number | null;
};

function readSky(payload: unknown, date: string): {
  pressureHpa: number | null;
  pressureTrend: "" | "rising" | "falling" | "stable";
  cloudPct: number | null;
  humidity: number | null;
  gustMph: number | null;
  precip24In: number | null;
  frontHours: number | null;
} {
  const empty = {
    pressureHpa: null,
    pressureTrend: "" as const,
    cloudPct: null,
    humidity: null,
    gustMph: null,
    precip24In: null,
    frontHours: null,
  };
  if (!payload || typeof payload !== "object") return empty;
  const hourly = (payload as { hourly?: Record<string, unknown> }).hourly;
  if (!hourly || !Array.isArray(hourly.time)) return empty;
  const times = hourly.time as string[];
  const pressure = numList(hourly.pressure_msl);
  const cloud = numList(hourly.cloud_cover);
  const humidity = numList(hourly.relative_humidity_2m);
  const gust = numList(hourly.wind_gusts_10m);
  const rain = numList(hourly.precipitation);
  const series: { at: number; pressure: number | null; cloud: number | null; humidity: number | null; gust: number | null; rain: number | null }[] =
    [];
  times.forEach((stamp, i) => {
    const at = atFromStamp(stamp, date);
    if (at == null) return;
    series.push({
      at,
      pressure: finite(pressure[i]),
      cloud: finite(cloud[i]),
      humidity: finite(humidity[i]),
      gust: finite(gust[i]),
      rain: finite(rain[i]),
    });
  });
  const day = series.filter((hour) => hour.at >= 6 * 60 && hour.at < 18 * 60);
  if (!day.length) return empty;
  const mid = day[Math.floor(day.length / 2)];
  const first = day.find((hour) => hour.pressure != null);
  const last = [...day].reverse().find((hour) => hour.pressure != null);
  let pressureTrend: "" | "rising" | "falling" | "stable" = "";
  if (first?.pressure != null && last?.pressure != null && first !== last) {
    const delta = last.pressure - first.pressure;
    pressureTrend = delta >= 1.5 ? "rising" : delta <= -1.5 ? "falling" : "stable";
  }
  const avg = (values: Array<number | null>) => {
    const nums = values.filter((value): value is number => value != null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };
  return {
    pressureHpa: mid.pressure,
    pressureTrend,
    cloudPct: avg(day.map((hour) => hour.cloud)),
    humidity: avg(day.map((hour) => hour.humidity)),
    gustMph: avg(day.map((hour) => hour.gust)),
    precip24In: rainBeforeNoon(series),
    frontHours: frontFromNoon(series),
  };
}

function rainBeforeNoon(
  series: { at: number; rain: number | null }[],
): number | null {
  const noon = 12 * 60;
  let total = 0;
  let any = false;
  for (const hour of series) {
    if (hour.at <= noon - 24 * 60 || hour.at > noon || hour.rain == null) continue;
    total += hour.rain;
    any = true;
  }
  return any ? total : null;
}

function frontFromNoon(series: { at: number; pressure: number | null }[]): number | null {
  const noon = 12 * 60;
  const byHour = new Map<number, number>();
  for (const hour of series) {
    if (hour.pressure == null) continue;
    byHour.set(Math.round(hour.at / 60), hour.pressure);
  }
  let bestDrop = 0;
  let bestAt = 0;
  for (const [hour, pressure] of byHour) {
    const before = byHour.get(hour - 6);
    if (before == null) continue;
    const drop = before - pressure;
    if (drop > bestDrop) {
      bestDrop = drop;
      bestAt = hour;
    }
  }
  if (bestDrop < 3) return null;
  return bestAt - noon / 60;
}

function readWeather(payload: unknown, date: string): { ok: boolean; hours: Map<number, WxHour> } {
  const hours = new Map<number, WxHour>();
  if (!payload || typeof payload !== "object") return { ok: false, hours };
  const hourly = (payload as { hourly?: Record<string, unknown> }).hourly;
  if (!hourly || !Array.isArray(hourly.time)) return { ok: false, hours };
  const times = hourly.time as string[];
  const air = numList(hourly.temperature_2m);
  const wind = numList(hourly.wind_speed_10m);
  const dir = numList(hourly.wind_direction_10m);
  const precip = numList(hourly.precipitation_probability);
  const code = numList(hourly.weather_code);
  times.forEach((stamp, i) => {
    const at = atFromStamp(stamp, date);
    if (at == null || at < 0 || at >= 1440) return;
    hours.set(at, {
      at,
      airF: finite(air[i]),
      windMph: finite(wind[i]),
      windDeg: finite(dir[i]),
      precipPct: finite(precip[i]),
      weatherCode: finite(code[i]),
    });
  });
  return { ok: hours.size > 0, hours };
}

function readWaves(payload: unknown, date: string): Map<number, number> {
  const map = new Map<number, number>();
  if (!payload || typeof payload !== "object") return map;
  const hourly = (payload as { hourly?: { time?: string[]; wave_height?: number[] } }).hourly;
  if (!hourly?.time || !hourly.wave_height) return map;
  hourly.time.forEach((stamp, i) => {
    const at = atFromStamp(stamp, date);
    const meters = hourly.wave_height?.[i];
    if (at == null || at < 0 || at >= 1440 || meters == null) return;
    map.set(at, meters * 3.28084);
  });
  return map;
}

function readWater(payload: unknown, today: string): number | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as { data?: { t?: string; v?: string }[]; error?: unknown };
  if (body.error || !Array.isArray(body.data) || !body.data.length) return null;
  const last = body.data[body.data.length - 1];
  if (!last?.t || !last.v) return null;
  const day = last.t.slice(0, 10);
  if (Math.abs(calendarDiff(today, day)) > 1) return null;
  const v = Number(last.v);
  return Number.isNaN(v) ? null : v;
}

function mergeHours(
  tides: Map<number, number>,
  wx: Map<number, WxHour>,
  waves: Map<number, number>,
): HourPoint[] {
  const keys = new Set<number>([...tides.keys(), ...wx.keys(), ...waves.keys()]);
  return [...keys].sort((a, b) => a - b).map((at) => {
    const w = wx.get(at);
    return {
      at,
      tideFt: tides.get(at) ?? null,
      airF: w?.airF ?? null,
      windMph: w?.windMph ?? null,
      windDeg: w?.windDeg ?? null,
      precipPct: w?.precipPct ?? null,
      weatherCode: w?.weatherCode ?? null,
      waveFt: waves.get(at) ?? null,
    };
  });
}

function finite(n: number | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function numList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((n) => (typeof n === "number" ? n : Number.NaN));
}
