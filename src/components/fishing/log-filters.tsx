import { baitOptions, placeOptions, type LogFilter } from "@/lib/fishing/log-filter";
import type { CatchRow } from "@/lib/fishing/types";
import { SPECIES, TIDE_STAGES } from "@/lib/fishing/types";
import type { Waypoint } from "@/lib/fishing/waypoints";

const field = "h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg";

export function LogFilterBar({
  rows,
  waypoints,
  value,
  onChange,
}: {
  rows: CatchRow[];
  waypoints: Waypoint[];
  value: LogFilter;
  onChange: (next: LogFilter) => void;
}) {
  const baits = baitOptions(rows);
  const places = placeOptions(rows, waypoints);
  function set<K extends keyof LogFilter>(key: K, next: LogFilter[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select className={field} value={value.species} onChange={(event) => set("species", event.target.value as LogFilter["species"])} aria-label="Filter by species">
        <option value="">All species</option>
        {SPECIES.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <select className={field} value={value.tide} onChange={(event) => set("tide", event.target.value as LogFilter["tide"])} aria-label="Filter by tide">
        <option value="">All tides</option>
        {TIDE_STAGES.map((stage) => (
          <option key={stage}>{stage}</option>
        ))}
      </select>
      <select className={field} value={value.bait} onChange={(event) => set("bait", event.target.value)} aria-label="Filter by bait">
        <option value="">All bait</option>
        {baits.map((bait) => (
          <option key={bait}>{bait}</option>
        ))}
      </select>
      <select className={field} value={value.place} onChange={(event) => set("place", event.target.value)} aria-label="Filter by place">
        <option value="">All places</option>
        {places.map((place) => (
          <option key={place}>{place}</option>
        ))}
      </select>
      <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted">
        From
        <input type="date" className="bg-transparent text-fg" value={value.from} onChange={(event) => set("from", event.target.value)} aria-label="From date" />
      </label>
      <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted">
        To
        <input type="date" className="bg-transparent text-fg" value={value.to} onChange={(event) => set("to", event.target.value)} aria-label="To date" />
      </label>
      <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted">
        At least
        <input
          type="number"
          min={0}
          inputMode="decimal"
          className="w-16 bg-transparent text-fg"
          value={value.minLength}
          onChange={(event) => set("minLength", event.target.value)}
          aria-label="Minimum length in inches"
        />
        in
      </label>
    </div>
  );
}
