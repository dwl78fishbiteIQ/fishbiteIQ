import { moonOn } from "@/lib/fishing/moon";

/** Charleston harbor, the same water the tide advice uses. */
const LAT = 32.78167;
const LNG = -79.925;

export type SolunarPeriod = {
  kind: "major" | "minor";
  name: string;
  /** Local minutes. May start before midnight or end after it. */
  start: number;
  end: number;
};

export type SolunarDay = {
  periods: SolunarPeriod[];
  sunrise: number | null;
  sunset: number | null;
  rating: "Excellent" | "Good" | "Fair" | "Average";
  note: string;
};

type Body = { ra: number; dec: number; h0: number };

export function solunarOn(isoDate: string): SolunarDay {
  const offset = easternOffsetMinutes(isoDate);
  const moon = events(isoDate, offset, (minute) => moonBody(isoDate, minute, offset));
  const sun = events(isoDate, offset, (minute) => sunBody(isoDate, minute, offset));
  const periods = [
    period(moon.overhead, 60, "major", "Moon overhead"),
    period(moon.underfoot, 60, "major", "Moon underfoot"),
    period(moon.rise, 30, "minor", "Moonrise"),
    period(moon.set, 30, "minor", "Moonset"),
  ]
    .filter((item): item is SolunarPeriod => item != null)
    .sort((a, b) => a.start - b.start);

  const sunrise = onThisDay(sun.rise);
  const sunset = onThisDay(sun.set);
  const age = moonOn(isoDate).age;
  const syzygy = age < 2 || age > 27.5 || (age > 13.3 && age < 16.2);
  let score = syzygy ? 2 : 0;
  const majors = periods.filter((item) => item.kind === "major");
  const nearLight = majors.some((item) => {
    const mid = (item.start + item.end) / 2;
    return (
      (sunrise != null && Math.abs(mid - sunrise) <= 90) || (sunset != null && Math.abs(mid - sunset) <= 90)
    );
  });
  if (nearLight) score += 1;
  const rating = score >= 3 ? "Excellent" : score === 2 ? "Good" : score === 1 ? "Fair" : "Average";
  const phase = syzygy ? "New or full moon strengthens the majors." : "The moon is away from new and full, so the periods are weaker.";
  const light = nearLight ? " One major sits near sunrise or sunset." : "";
  return {
    periods,
    sunrise,
    sunset,
    rating,
    note: `${phase}${light} Major periods run two hours. Minor periods run one hour.`,
  };
}

function period(center: number | null, half: number, kind: SolunarPeriod["kind"], name: string): SolunarPeriod | null {
  if (center == null || center < 0 || center >= 1440) return null;
  return { kind, name, start: center - half, end: center + half };
}

function onThisDay(minute: number | null): number | null {
  if (minute == null || minute < 0 || minute >= 1440) return null;
  return minute;
}

type Crossings = { rise: number | null; set: number | null; overhead: number | null; underfoot: number | null };

function events(iso: string, offset: number, bodyAt: (minute: number) => Body): Crossings {
  const found: Crossings = { rise: null, set: null, overhead: null, underfoot: null };
  let prev = sample(iso, -3, offset, bodyAt);
  for (let minute = -2; minute <= 1442; minute += 1) {
    const next = sample(iso, minute, offset, bodyAt);
    if (found.rise == null && prev.alt < prev.h0 && next.alt >= next.h0) found.rise = minute;
    if (found.set == null && prev.alt > prev.h0 && next.alt <= next.h0) found.set = minute;
    if (found.overhead == null && prev.ha < 0 && next.ha >= 0 && Math.abs(next.ha) < 30) found.overhead = minute;
    if (found.underfoot == null && prev.ha > 90 && next.ha < -90) found.underfoot = minute;
    prev = next;
  }
  return found;
}

function sample(iso: string, minute: number, offset: number, bodyAt: (minute: number) => Body): { alt: number; ha: number; h0: number } {
  const body = bodyAt(minute);
  const jd = julianAt(iso, minute, offset);
  const ha = hourAngle(jd, body.ra);
  return { alt: altitude(body.dec, ha), ha, h0: body.h0 };
}

function moonBody(iso: string, minute: number, offset: number): Body {
  const jd = julianAt(iso, minute, offset);
  const moon = moonEquatorial(jd);
  return { ra: moon.ra, dec: moon.dec, h0: 0.7275 * moon.parallax - 0.5667 };
}

function sunBody(iso: string, minute: number, offset: number): Body {
  const jd = julianAt(iso, minute, offset);
  const sun = sunEquatorial(jd);
  return { ra: sun.ra, dec: sun.dec, h0: -0.833 };
}

function julianAt(iso: string, localMinute: number, offset: number): number {
  const [year, month, day] = iso.split("-").map(Number);
  return julianDayUTC(year, month, day) + (localMinute - offset) / 1440;
}

function easternOffsetMinutes(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day, 16, 0, 0);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utc));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute - 16 * 60;
}

function julianDayUTC(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

function moonEquatorial(jd: number): { ra: number; dec: number; parallax: number } {
  const d = jd - 2451545.0;
  const lon0 = wrap(218.3164477 + 13.17639648 * d);
  const anomaly = wrap(134.9633964 + 13.06499295 * d);
  const node = wrap(93.272095 + 13.22935024 * d);
  const sunLon = wrap(280.46646 + 0.98564736 * d);
  const sunAnomaly = wrap(357.52911 + 0.98560028 * d);
  const elong = wrap(lon0 - sunLon);
  const Mr = rad(anomaly);
  const Fr = rad(node);
  const Dr = rad(elong);
  const Sr = rad(sunAnomaly);
  const lon = wrap(
    lon0 +
      6.289 * Math.sin(Mr) +
      1.274 * Math.sin(2 * Dr - Mr) +
      0.658 * Math.sin(2 * Dr) +
      0.214 * Math.sin(2 * Mr) -
      0.186 * Math.sin(Sr) -
      0.114 * Math.sin(2 * Fr) +
      0.059 * Math.sin(2 * Dr - 2 * Mr) +
      0.057 * Math.sin(2 * Dr - Sr - Mr) +
      0.053 * Math.sin(2 * Dr + Mr) +
      0.046 * Math.sin(2 * Dr - Sr) +
      0.041 * Math.sin(Mr - Sr) -
      0.035 * Math.sin(Dr) -
      0.031 * Math.sin(Mr + Sr) -
      0.015 * Math.sin(2 * Fr - 2 * Dr) +
      0.011 * Math.sin(Mr - 2 * Fr),
  );
  const lat =
    5.128 * Math.sin(Fr) +
    0.281 * Math.sin(Mr + Fr) +
    0.278 * Math.sin(Mr - Fr) +
    0.173 * Math.sin(2 * Dr - Fr) +
    0.055 * Math.sin(2 * Dr - Mr + Fr) +
    0.046 * Math.sin(2 * Dr - Mr - Fr) +
    0.033 * Math.sin(2 * Dr + Fr) +
    0.017 * Math.sin(2 * Mr + Fr);
  const parallax =
    0.9508 + 0.0518 * Math.cos(Mr) + 0.0095 * Math.cos(2 * Dr - Mr) + 0.0078 * Math.cos(2 * Dr) + 0.0028 * Math.cos(2 * Mr);
  return equatorial(lon, lat, d, parallax);
}

function sunEquatorial(jd: number): { ra: number; dec: number } {
  const d = jd - 2451545.0;
  const mean = wrap(280.46646 + 0.98564736 * d);
  const anomaly = wrap(357.52911 + 0.98560028 * d);
  const lon = wrap(mean + 1.915 * Math.sin(rad(anomaly)) + 0.02 * Math.sin(rad(2 * anomaly)));
  const place = equatorial(lon, 0, d, 0);
  return { ra: place.ra, dec: place.dec };
}

function equatorial(lon: number, lat: number, d: number, parallax: number): { ra: number; dec: number; parallax: number } {
  const eps = rad(23.439291 - 0.0130042 * (d / 36525));
  const lonR = rad(lon);
  const latR = rad(lat);
  const ra = deg(
    Math.atan2(Math.sin(lonR) * Math.cos(eps) - Math.tan(latR) * Math.sin(eps), Math.cos(lonR)),
  );
  const dec = deg(Math.asin(Math.sin(latR) * Math.cos(eps) + Math.cos(latR) * Math.sin(eps) * Math.sin(lonR)));
  return { ra: wrap(ra), dec, parallax };
}

function hourAngle(jd: number, ra: number): number {
  const d = jd - 2451545.0;
  const gmst = wrap(280.46061837 + 360.98564736629 * d);
  let ha = wrap(gmst + LNG) - ra;
  if (ha > 180) ha -= 360;
  if (ha < -180) ha += 360;
  return ha;
}

function altitude(dec: number, ha: number): number {
  const phi = rad(LAT);
  const decR = rad(dec);
  const haR = rad(ha);
  return deg(Math.asin(Math.sin(phi) * Math.sin(decR) + Math.cos(phi) * Math.cos(decR) * Math.cos(haR)));
}

function wrap(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function deg(radian: number): number {
  return (radian * 180) / Math.PI;
}
