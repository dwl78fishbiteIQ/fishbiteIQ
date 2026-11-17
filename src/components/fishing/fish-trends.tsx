import { useMemo, useState } from "react";
import { LogFilterBar } from "@/components/fishing/log-filters";
import { EMPTY_FILTER, filterRows, type LogFilter } from "@/lib/fishing/log-filter";
import { moonOn } from "@/lib/fishing/moon";
import { tidePhrase } from "@/lib/fishing/station";
import { formatPrettyDate } from "@/lib/fishing/time";
import type { CatchRow, Species } from "@/lib/fishing/types";
import { SPECIES } from "@/lib/fishing/types";
import type { Waypoint } from "@/lib/fishing/waypoints";

export function FishTrends({ rows, waypoints }: { rows: CatchRow[]; waypoints: Waypoint[] }) {
  const [filter, setFilter] = useState<LogFilter>(EMPTY_FILTER);
  const [picked, setPicked] = useState<Species | "">("");
  const narrowed = useMemo(
    () => filterRows(rows, { ...filter, species: "" }, waypoints),
    [rows, filter, waypoints],
  );
  const named = useMemo(() => narrowed.filter((row) => row.species), [narrowed]);
  const listed = useMemo(
    () => SPECIES.filter((species) => named.some((row) => row.species === species)),
    [named],
  );
  const selected = listed.find((species) => species === picked) ?? listed[0] ?? "";
  const history = selected ? named.filter((row) => row.species === selected) : [];
  const mine = history.filter((row) => row.count > 0);
  const newest = [...mine].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl text-fg">Fish Trends</h2>
        <p className="max-w-2xl text-sm text-muted">
          Calculated only from the catch log
          {named.length ? ` · ${named.length} trip${named.length === 1 ? "" : "s"} in this filter` : ""}.
          {newest ? ` Newest catch ${formatPrettyDate(newest.date)}.` : ""}
        </p>
      </div>
      <LogFilterBar
        rows={rows}
        waypoints={waypoints}
        value={{ ...filter, species: selected }}
        onChange={(next) => {
          setFilter(next);
          setPicked(next.species);
        }}
      />
      {selected ? (
        <SpeciesTrend species={selected} rows={mine} history={history} />
      ) : (
        <p className="text-sm text-muted">No trips match that filter.</p>
      )}
    </div>
  );
}

const PHASES = [
  "New moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
] as const;

type PhaseStat = { name: (typeof PHASES)[number]; fish: number; trips: number; rate: number };

function phaseTally(rows: CatchRow[]): PhaseStat[] {
  return PHASES.map((name) => {
    const mine = rows.filter((row) => moonOn(row.date).name === name);
    const fish = mine.reduce((sum, row) => sum + row.count, 0);
    return { name, fish, trips: mine.length, rate: mine.length ? fish / mine.length : 0 };
  });
}

const TRENDS = ["falling", "stable", "rising"] as const;
const BANDS = ["Under 29.80", "29.80–29.94", "29.95–30.09", "30.10–30.24", "30.25 and up"] as const;

function PressureImpact({ rows }: { rows: CatchRow[] }) {
  const known = rows.filter((row) => row.meteo?.pressureHpa != null || row.meteo?.pressureTrend);
  const trends = TRENDS.map((name) => ({ ...rateOf(known.filter((row) => row.meteo?.pressureTrend === name)), name }));
  const ranked = trends.filter((item) => item.trips >= 2).sort((a, b) => b.rate - a.rate);
  const bands = BANDS.map((name) => ({ ...rateOf(known.filter((row) => pressureBand(row) === name)), name })).filter(
    (item) => item.trips > 0,
  );
  const bestBand = [...bands].filter((item) => item.trips >= 2).sort((a, b) => b.rate - a.rate)[0];
  const before = rateOf(known.filter((row) => row.meteo?.frontHours != null && row.meteo.frontHours < 0));
  const after = rateOf(known.filter((row) => row.meteo?.frontHours != null && row.meteo.frontHours >= 0));
  const max = Math.max(...trends.map((item) => item.rate), 1);

  let reading = "Not enough trips recorded a barometer reading to judge pressure.";
  if (ranked.length >= 2) {
    const lead = ranked[0];
    const trail = ranked[ranked.length - 1];
    reading =
      lead.rate < trail.rate * 1.25
        ? `${cap(lead.name)} pressure leads, but only barely (${lead.rate.toFixed(1)} vs ${trail.rate.toFixed(1)} fish per trip). Pressure is not separating this fish.`
        : `${cap(lead.name)} pressure is strongest: ${lead.rate.toFixed(1)} fish per trip, against ${trail.rate.toFixed(1)} when it was ${trail.name}.`;
  } else if (ranked[0]) {
    reading = `${cap(ranked[0].name)} pressure has ${ranked[0].rate.toFixed(1)} fish per trip. The other trends don't have two trips yet.`;
  }
  if (bestBand) reading += ` The best band is ${bestBand.name} inHg, ${bestBand.rate.toFixed(1)} fish per trip.`;
  if (before.trips >= 2 && after.trips >= 2) {
    const lean = before.rate >= after.rate ? "before" : "after";
    reading += ` Trips ${lean} a front did better (${Math.max(before.rate, after.rate).toFixed(1)} vs ${Math.min(before.rate, after.rate).toFixed(1)} fish per trip).`;
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <h4 className="text-base text-fg">Barometric pressure</h4>
      <p className="mt-1 text-sm text-fg">{reading}</p>
      {known.length ? (
        <ul className="mt-3 space-y-2">
          {TRENDS.map((name, index) => (
            <li key={name} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-sm">
              <span className="text-fg capitalize">{name}</span>
              <span className="h-2 rounded-full bg-bg">
                <span
                  className="block h-2 rounded-full bg-accent"
                  style={{ width: `${trends[index].trips ? Math.max(8, (trends[index].rate / max) * 100) : 0}%` }}
                />
              </span>
              <span className="text-muted tabular-nums">
                {trends[index].trips ? `${trends[index].rate.toFixed(1)} · ${trends[index].trips}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted">Photo catches save the pressure. Older trips may not have it.</p>
      )}
    </div>
  );
}

function rateOf(rows: CatchRow[]): { name: string; trips: number; rate: number } {
  const fish = rows.reduce((sum, row) => sum + row.count, 0);
  return { name: "", trips: rows.length, rate: rows.length ? fish / rows.length : 0 };
}

function pressureBand(row: CatchRow): string | null {
  const hpa = row.meteo?.pressureHpa;
  if (hpa == null) return null;
  const reading = hpa * 0.02953;
  if (reading < 29.8) return "Under 29.80";
  if (reading < 29.95) return "29.80–29.94";
  if (reading < 30.1) return "29.95–30.09";
  if (reading < 30.25) return "30.10–30.24";
  return "30.25 and up";
}

function cap(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function bestPhase(rows: CatchRow[]): string | null {
  const best = phaseTally(rows)
    .filter((phase) => phase.trips > 0)
    .sort((a, b) => b.rate - a.rate || b.fish - a.fish)[0];
  return best?.name ?? null;
}

function SpeciesTrend({
  species,
  rows,
  history,
}: {
  species: Species;
  rows: CatchRow[];
  history: CatchRow[];
}) {
  if (!rows.length) {
    return (
      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-2xl text-fg">{species}</h3>
        <p className="mt-1 text-sm text-muted">No catches in the catch log yet.</p>
      </section>
    );
  }

  const fish = rows.reduce((sum, row) => sum + row.count, 0);
  const points = trendPoints(rows);
  const moon = bestPhase(history);
  if (moon) points.push({ label: "Moon", value: moon });

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-2xl text-fg">{species}</h3>
        <p className="text-sm text-muted">
          {fish} fish on {rows.length} trip{rows.length === 1 ? "" : "s"}
        </p>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {points.map((point) => (
          <div key={point.label} className="rounded-lg bg-bg px-3 py-2">
            <dt className="text-xs font-semibold tracking-widest text-accent uppercase">{point.label}</dt>
            <dd className="text-sm text-fg">{point.value}</dd>
          </div>
        ))}
      </dl>
      <PressureImpact rows={history} />
    </section>
  );
}

type Point = { label: string; value: string; key?: string; low?: number; high?: number; wind?: string };

function trendPoints(rows: CatchRow[]): Point[] {
  const points: Point[] = [];
  const timed = rows.filter((row) => row.tideHours != null && row.tideTurn);
  const tide = timed.length ? weightedMode(timed, (row) => tidePhrase(row)) : weightedMode(rows, (row) => row.tideStage);
  if (tide) points.push({ label: "Tide", value: tide });
  const water = numberBand(rows.map((row) => row.waterTempF ?? row.meteo?.waterF ?? null));
  if (water) points.push({ label: "Water", value: `${water.text}°F`, key: "water", low: water.low, high: water.high });
  const air = numberBand(rows.map((row) => row.airTempF ?? row.meteo?.airF ?? null));
  if (air) points.push({ label: "Air", value: `${air.text}°F`, key: "air", low: air.low, high: air.high });
  const wind = weightedMode(rows, (row) => row.windDir || row.meteo?.windDir || "");
  const windSpeed = numberBand(rows.map((row) => row.windMph ?? row.meteo?.windMph ?? null));
  if (wind || windSpeed) {
    points.push({
      label: "Wind",
      value: [wind, windSpeed ? `${windSpeed.text} mph` : ""].filter(Boolean).join(" · "),
      key: "wind",
      wind: wind ?? undefined,
      low: windSpeed?.low,
      high: windSpeed?.high,
    });
  }
  const clouds = numberBand(rows.map((row) => row.meteo?.cloudPct ?? null));
  if (clouds) points.push({ label: "Clouds", value: `${clouds.text}%` });
  const waves = numberBand(rows.map((row) => row.meteo?.waveFt ?? null), 1);
  if (waves) points.push({ label: "Waves", value: `${waves.text} ft` });
  const bait = weightedMode(rows, (row) => row.bait.trim());
  if (bait) points.push({ label: "Bait", value: bait });
  return points;
}

function weightedMode(rows: CatchRow[], pick: (row: CatchRow) => string): string | null {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const value = pick(row).trim();
    if (!value) continue;
    totals.set(value, (totals.get(value) ?? 0) + Math.max(row.count, 1));
  }
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? null;
}

function numberBand(values: Array<number | null>, digits = 0): { text: string; low: number; high: number } | null {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const low = nums[Math.floor((nums.length - 1) * 0.25)];
  const high = nums[Math.ceil((nums.length - 1) * 0.75)];
  const text = round(low, digits) === round(high, digits) ? round(low, digits) : `${round(low, digits)}–${round(high, digits)}`;
  return { text, low, high };
}

function round(value: number, digits: number): string {
  return digits === 0 ? String(Math.round(value)) : value.toFixed(digits);
}
