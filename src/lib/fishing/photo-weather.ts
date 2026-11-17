import { createServerFn } from "@tanstack/react-start";
import { degToWind } from "@/lib/fishing/time";
import type { MeteoSnap, WindDir } from "@/lib/fishing/types";

const MODELS = [
  { id: "ecmwf_ifs", name: "ECMWF", agency: "European Centre" },
  { id: "gfs_seamless", name: "GFS", agency: "NOAA" },
  { id: "icon_seamless", name: "ICON", agency: "German Weather Service" },
  { id: "ncep_nam_conus", name: "NAM", agency: "NOAA" },
] as const;

const SURFACE =
  "temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,precipitation_probability,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility";

const MARINE = "wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_direction,sea_surface_temperature";

const CURRENTS: { id: string; name: string; lat: number; lng: number }[] = [
  { id: "ACT6651", name: "Charleston Harbor, off Fort Sumter", lat: 32.756, lng: -79.8703 },
  { id: "ACT6636", name: "Charleston Harbor entrance", lat: 32.7333, lng: -79.8333 },
  { id: "ACT6706", name: "Lower Town Creek Reach", lat: 32.7925, lng: -79.9245 },
  { id: "ACT6726", name: "Hog Island Channel", lat: 32.7812, lng: -79.8763 },
  { id: "ACT6751", name: "Hog Island Reach", lat: 32.7945, lng: -79.915 },
  { id: "ACT6906", name: "Wando River", lat: 32.8333, lng: -79.8967 },
  { id: "ACT6946", name: "Ashley River", lat: 32.782, lng: -79.96 },
  { id: "ACT6976", name: "Stono Inlet", lat: 32.6267, lng: -79.9933 },
  { id: "ACT6806", name: "North Charleston", lat: 32.8637, lng: -79.9588 },
];

export type ModelRead = {
  id: string;
  name: string;
  agency: string;
  airF: number | null;
  windMph: number | null;
  windDir: WindDir | "";
  precipPct: number | null;
};

export type PhotoWeather = {
  models: ModelRead[];
  airF: number | null;
  windMph: number | null;
  windDir: WindDir | "";
  snap: MeteoSnap | null;
};

export async function loadPhotoWeather(data: {
  lat: number;
  lng: number;
  date: string;
  time: string;
}): Promise<PhotoWeather | null> {
  const [fresh, plain, marine, current] = await Promise.all([
    pullModels("https://api.open-meteo.com/v1/forecast", data),
    pullPlain("https://api.open-meteo.com/v1/forecast", data),
    pullMarine(data),
    pullCurrent(data),
  ]);
  const modelsBody = hasAny(fresh)
    ? fresh
    : await pullModels("https://historical-forecast-api.open-meteo.com/v1/forecast", data);
  const plainBody = hasPlain(plain) ? plain : await pullPlain("https://archive-api.open-meteo.com/v1/archive", data);
  const snap = readSnap(plainBody, marine, current, data);
  const fromModels = readModels(modelsBody, data);
  if (!fromModels && !snap) return null;
  return {
    models: fromModels?.models ?? [],
    airF: snap?.airF ?? fromModels?.airF ?? null,
    windMph: snap?.windMph ?? fromModels?.windMph ?? null,
    windDir: snap?.windDir || fromModels?.windDir || "",
    snap,
  };
}

export const getPhotoWeather = createServerFn({ method: "GET" })
  .validator((input: { lat: number; lng: number; date: string; time: string }) => {
    if (!input || !Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
      throw new Error("Need a photo location.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
      throw new Error("Need the photo date and time.");
    }
    return input;
  })
  .handler(async ({ data }): Promise<PhotoWeather | null> => loadPhotoWeather(data));

export function meteoLines(snap: MeteoSnap): Array<[string, string]> {
  const lines: Array<[string, string]> = [];
  const add = (label: string, value: string | null) => {
    if (value) lines.push([label, value]);
  };
  add("Water temperature", snap.waterF == null ? null : `${Math.round(snap.waterF)}°F`);
  add("Tide stage", snap.tideStage || null);
  add("Tidal current", snap.currentText || null);
  add("Wind direction", snap.windDir || null);
  add(
    "Wind speed",
    snap.windMph == null ? null : `${Math.round(snap.windMph)} mph (${Math.round(snap.windMph * 0.869)} kt)`,
  );
  add("Barometric pressure", snap.pressureHpa == null ? null : `${(snap.pressureHpa * 0.02953).toFixed(2)} inHg`);
  add("Pressure trend", snap.pressureTrend || null);
  add("Air temperature", snap.airF == null ? null : `${Math.round(snap.airF)}°F`);
  add("Cloud cover", snap.cloudPct == null ? null : `${Math.round(snap.cloudPct)}%`);
  add("Precipitation", rainLine(snap));
  add("Front passage", frontLine(snap.frontHours));
  add("Wave/swell", waveLine(snap));
  return lines;
}

function rainLine(snap: MeteoSnap): string | null {
  const parts: string[] = [];
  if (snap.precipIn != null) parts.push(`${snap.precipIn.toFixed(2)} in this hour`);
  if (snap.precip24In != null) parts.push(`${snap.precip24In.toFixed(2)} in / 24h`);
  if (snap.precip48In != null) parts.push(`${snap.precip48In.toFixed(2)} in / 48h`);
  if (snap.precip72In != null) parts.push(`${snap.precip72In.toFixed(2)} in / 72h`);
  return parts.length ? parts.join(" · ") : null;
}

function frontLine(hours: number | null | undefined): string | null {
  if (hours == null) return "No clear front nearby";
  if (hours === 0) return "At the front";
  if (hours > 0) return `${hours} hours after`;
  return `${-hours} hours before`;
}

function waveLine(snap: MeteoSnap): string | null {
  const parts: string[] = [];
  if (snap.waveFt != null) parts.push(`${snap.waveFt.toFixed(1)} ft`);
  if (snap.wavePeriodS != null) parts.push(`${Math.round(snap.wavePeriodS)} sec`);
  if (snap.waveDir) parts.push(snap.waveDir);
  if (snap.swellFt != null) parts.push(`swell ${snap.swellFt.toFixed(1)} ft${snap.swellDir ? ` ${snap.swellDir}` : ""}`);
  return parts.length ? parts.join(" · ") : null;
}

function readModels(
  body: unknown,
  data: { date: string; time: string },
): Pick<PhotoWeather, "models" | "airF" | "windMph" | "windDir"> | null {
  const hit = hourOf(body, data);
  if (!hit) return null;
  const models = MODELS.map((model) => {
    const airF = at(hit.hourly[`temperature_2m_${model.id}`], hit.index);
    const windMph = at(hit.hourly[`wind_speed_10m_${model.id}`], hit.index);
    const deg = at(hit.hourly[`wind_direction_10m_${model.id}`], hit.index);
    const precipPct = at(hit.hourly[`precipitation_probability_${model.id}`], hit.index);
    return {
      id: model.id,
      name: model.name,
      agency: model.agency,
      airF,
      windMph,
      windDir: deg == null ? "" : degToWind(deg),
      precipPct,
    } satisfies ModelRead;
  }).filter((model) => model.airF != null || model.windMph != null);
  if (!models.length) return null;
  const wind = median(models.map((model) => model.windMph));
  const nearest =
    wind == null
      ? models.find((model) => model.windDir)
      : models.reduce(
          (best, model) => {
            if (model.windMph == null || !model.windDir) return best;
            if (!best || best.windMph == null) return model;
            return Math.abs(model.windMph - wind) < Math.abs(best.windMph - wind) ? model : best;
          },
          null as ModelRead | null,
        );
  return {
    models,
    airF: median(models.map((model) => model.airF)),
    windMph: wind,
    windDir: nearest?.windDir ?? "",
  };
}

function readSnap(
  weather: unknown,
  marine: unknown,
  current: { text: string; knots: number } | null,
  data: { date: string; time: string },
): MeteoSnap | null {
  const sky = hourOf(weather, data);
  const sea = hourOf(marine, data);
  if (!sky && !sea && !current) return null;
  const n = (bag: Record<string, unknown> | undefined, key: string, index: number) =>
    bag ? at(bag[key], index) : null;
  const windDeg = n(sky?.hourly, "wind_direction_10m", sky?.index ?? 0);
  const visibilityM = n(sky?.hourly, "visibility", sky?.index ?? 0);
  const pressure = sky ? nums(sky.hourly.pressure_msl) : [];
  const precip = sky ? nums(sky.hourly.precipitation) : [];
  const index = sky?.index ?? 0;
  const waveDeg = n(sea?.hourly, "wave_direction", sea?.index ?? 0);
  const swellDeg = n(sea?.hourly, "swell_wave_direction", sea?.index ?? 0);
  const snap: MeteoSnap = {
    airF: n(sky?.hourly, "temperature_2m", sky?.index ?? 0),
    feelsF: n(sky?.hourly, "apparent_temperature", sky?.index ?? 0),
    dewF: n(sky?.hourly, "dew_point_2m", sky?.index ?? 0),
    humidity: n(sky?.hourly, "relative_humidity_2m", sky?.index ?? 0),
    pressureHpa: n(sky?.hourly, "pressure_msl", index) ?? n(sky?.hourly, "surface_pressure", index),
    precipIn: n(sky?.hourly, "precipitation", index),
    precipPct: n(sky?.hourly, "precipitation_probability", index),
    rainIn: n(sky?.hourly, "rain", index),
    cloudPct: n(sky?.hourly, "cloud_cover", index),
    visibilityMi: visibilityM == null ? null : visibilityM / 1609.344,
    gustMph: n(sky?.hourly, "wind_gusts_10m", index),
    windMph: n(sky?.hourly, "wind_speed_10m", index),
    windDir: windDeg == null ? "" : degToWind(windDeg),
    weatherCode: n(sky?.hourly, "weather_code", index),
    waterF: n(sea?.hourly, "sea_surface_temperature", sea?.index ?? 0),
    waveFt: n(sea?.hourly, "wave_height", sea?.index ?? 0),
    wavePeriodS: n(sea?.hourly, "wave_period", sea?.index ?? 0),
    waveDir: waveDeg == null ? "" : degToWind(waveDeg),
    swellFt: n(sea?.hourly, "swell_wave_height", sea?.index ?? 0),
    swellDir: swellDeg == null ? "" : degToWind(swellDeg),
    tideStage: "",
    currentKt: current?.knots ?? null,
    currentText: current?.text ?? "",
    pressureTrend: trend(pressure, index),
    precip24In: sumBack(precip, index, 24),
    precip48In: sumBack(precip, index, 48),
    precip72In: sumBack(precip, index, 72),
    frontHours: frontHours(pressure, index),
  };
  const any = Object.values(snap).some((value) => value != null && value !== "");
  return any ? snap : null;
}

function hourOf(
  body: unknown,
  data: { date: string; time: string },
): { hourly: Record<string, unknown>; index: number } | null {
  if (!body || typeof body !== "object") return null;
  const hourly = (body as { hourly?: Record<string, unknown> }).hourly;
  if (!hourly || !Array.isArray(hourly.time)) return null;
  const stamp = `${data.date}T${data.time.slice(0, 2)}:00`;
  const index = (hourly.time as string[]).findIndex((item) => item.startsWith(stamp));
  if (index < 0) return null;
  return { hourly, index };
}

const UNITS = {
  temperature_unit: "fahrenheit",
  wind_speed_unit: "mph",
  precipitation_unit: "inch",
  timezone: "America/New_York",
};

async function pullModels(base: string, data: { lat: number; lng: number; date: string }): Promise<unknown | null> {
  const q = new URLSearchParams({
    latitude: String(data.lat),
    longitude: String(data.lng),
    hourly: "temperature_2m,wind_speed_10m,wind_direction_10m,precipitation_probability",
    ...UNITS,
    start_date: data.date,
    end_date: data.date,
    models: MODELS.map((model) => model.id).join(","),
  });
  return getJson(`${base}?${q.toString()}`);
}

async function pullPlain(base: string, data: { lat: number; lng: number; date: string }): Promise<unknown | null> {
  const q = new URLSearchParams({
    latitude: String(data.lat),
    longitude: String(data.lng),
    hourly: SURFACE,
    ...UNITS,
    start_date: shiftDate(data.date, -3),
    end_date: shiftDate(data.date, 1),
  });
  return getJson(`${base}?${q.toString()}`);
}

async function pullMarine(data: { lat: number; lng: number; date: string }): Promise<unknown | null> {
  const q = new URLSearchParams({
    latitude: String(data.lat),
    longitude: String(data.lng),
    hourly: MARINE,
    temperature_unit: "fahrenheit",
    length_unit: "imperial",
    timezone: "America/New_York",
    start_date: data.date,
    end_date: data.date,
  });
  return getJson(`https://marine-api.open-meteo.com/v1/marine?${q.toString()}`);
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function hasAny(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const hourly = (body as { hourly?: Record<string, unknown> }).hourly;
  if (!hourly) return false;
  return MODELS.some((model) => Array.isArray(hourly[`temperature_2m_${model.id}`]));
}

function hasPlain(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const hourly = (body as { hourly?: Record<string, unknown> }).hourly;
  return Array.isArray(hourly?.temperature_2m);
}

function at(value: unknown, index: number): number | null {
  if (!Array.isArray(value)) return null;
  const n = value[index];
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function median(values: Array<number | null>): number | null {
  const nums = values.filter((value): value is number => value != null).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function nums(value: unknown): Array<number | null> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : null));
}

function sumBack(values: Array<number | null>, index: number, hours: number): number | null {
  if (!values.length || index < 0) return null;
  let total = 0;
  let any = false;
  for (let i = Math.max(0, index - hours + 1); i <= index; i += 1) {
    const value = values[i];
    if (value == null) continue;
    total += value;
    any = true;
  }
  return any ? total : null;
}

function trend(pressure: Array<number | null>, index: number): MeteoSnap["pressureTrend"] {
  const now = pressure[index];
  const prev = pressure[index - 3];
  if (now == null || prev == null) return "";
  const change = (now - prev) * 0.02953;
  if (change >= 0.02) return "rising";
  if (change <= -0.02) return "falling";
  return "stable";
}

function frontHours(pressure: Array<number | null>, index: number): number | null {
  let bestDrop = 0;
  let bestAt = -1;
  const from = Math.max(6, index - 36);
  const to = Math.min(pressure.length - 1, index + 24);
  for (let i = from; i <= to; i += 1) {
    const before = pressure[i - 6];
    const after = pressure[i];
    if (before == null || after == null) continue;
    const drop = before - after;
    if (drop > bestDrop) {
      bestDrop = drop;
      bestAt = i;
    }
  }
  if (bestDrop < 3 || bestAt < 0) return null;
  return bestAt - index;
}

function shiftDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

async function pullCurrent(data: {
  lat: number;
  lng: number;
  date: string;
  time: string;
}): Promise<{ text: string; knots: number } | null> {
  const station = CURRENTS.map((item) => ({ ...item, miles: milesBetween(data.lat, data.lng, item.lat, item.lng) })).sort(
    (a, b) => a.miles - b.miles,
  )[0];
  if (!station || station.miles > 25) return null;
  const day = data.date.replaceAll("-", "");
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=currents_predictions&station=${station.id}&begin_date=${day}&end_date=${day}&time_zone=lst_ldt&units=english&interval=30&format=json`;
  const body = await getJson(url);
  const rows = currentRows(body);
  if (!rows.length) return null;
  const want = clockMinutes(data.time);
  let best = rows[0];
  let bestGap = Infinity;
  for (const row of rows) {
    const gap = Math.abs(clockMinutes(row.time) - want);
    if (gap < bestGap) {
      best = row;
      bestGap = gap;
    }
  }
  const speed = Math.abs(best.velocity);
  const phase = speed < 0.15 ? "Slack" : best.velocity > 0 ? "Flood" : "Ebb";
  const dir = phase === "Slack" ? "" : degToWind(best.velocity > 0 ? best.flood : best.ebb);
  return {
    knots: speed,
    text: `${phase}${dir ? ` ${dir}` : ""} ${speed.toFixed(1)} kt · ${station.name}`,
  };
}

function currentRows(body: unknown): { time: string; velocity: number; flood: number; ebb: number }[] {
  if (!body || typeof body !== "object") return [];
  const bag = (body as { current_predictions?: { cp?: unknown } }).current_predictions?.cp;
  if (!Array.isArray(bag)) return [];
  return bag.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const velocity = Number(row.Velocity_Major);
    const flood = Number(row.meanFloodDir);
    const ebb = Number(row.meanEbbDir);
    if (typeof row.Time !== "string" || !Number.isFinite(velocity)) return [];
    return [{ time: row.Time, velocity, flood: Number.isFinite(flood) ? flood : 0, ebb: Number.isFinite(ebb) ? ebb : 0 }];
  });
}

function clockMinutes(value: string): number {
  const match = /(\d{2}):(\d{2})/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}
