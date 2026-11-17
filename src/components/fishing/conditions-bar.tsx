import { formatPrettyDate } from "@/lib/fishing/time";
import type { Conditions } from "@/lib/fishing/types";

export function ConditionsBar({
  date,
  onDate,
  conditions,
  loading,
  error,
}: {
  date: string;
  onDate: (date: string) => void;
  conditions: Conditions | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4" aria-label="Conditions">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Forecast</p>
          <h2 className="text-2xl text-fg">{formatPrettyDate(date)}</h2>
        </div>
        <label className="text-sm text-muted">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => onDate(e.target.value)}
            className="mt-1 block h-11 rounded-lg border border-border bg-bg px-3 text-base text-fg"
          />
        </label>
      </div>

      {loading ? <p className="mt-4 text-sm text-muted">Reading the forecast…</p> : null}
      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}

      {conditions ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat
            label="Wind"
            value={
              conditions.daylight.windDir
                ? `${conditions.daylight.windDir} ${conditions.daylight.windLow ?? "–"}–${conditions.daylight.windHigh ?? "–"} mph`
                : "Not in yet"
            }
          />
          {conditions.waterSource === "gauge" ? null : (
            <Stat label="Water, typical" value={`${conditions.waterF}°F`} />
          )}
          <Stat label="Sky" value={conditions.daylight.weatherLabel} />
          <Stat
            label="Jetty seas"
            value={conditions.daylight.waveFt == null ? "Not in yet" : `${conditions.daylight.waveFt.toFixed(1)} ft`}
          />
        </dl>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-fg tabular-nums">{value}</dd>
    </div>
  );
}
