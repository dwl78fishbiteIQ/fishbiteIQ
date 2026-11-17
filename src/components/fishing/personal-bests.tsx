import { formatPrettyDate, MONTHS } from "@/lib/fishing/time";
import type { CatchRow, Species } from "@/lib/fishing/types";
import { SPECIES } from "@/lib/fishing/types";

export function PersonalBests({ rows }: { rows: CatchRow[] }) {
  const caught = rows.filter((row) => row.species && row.count > 0);
  const listed = SPECIES.filter((species) => caught.some((row) => row.species === species));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl text-fg">Personal bests</h2>
        <p className="max-w-2xl text-sm text-muted">
          Longest fish, best month, and best bait for each species in the catch log.
        </p>
      </div>
      {listed.length ? (
        listed.map((species) => (
          <SpeciesBests key={species} species={species} rows={caught.filter((row) => row.species === species)} />
        ))
      ) : (
        <p className="text-sm text-muted">Confirm a catch and its bests will show up here.</p>
      )}
    </div>
  );
}

function SpeciesBests({ species, rows }: { species: Species; rows: CatchRow[] }) {
  const fish = rows.reduce((sum, row) => sum + row.count, 0);
  const longest = [...rows].filter((row) => row.lengthIn != null).sort((a, b) => (b.lengthIn ?? 0) - (a.lengthIn ?? 0))[0];
  const months = new Map<number, number>();
  for (const row of rows) {
    const month = Number(row.date.slice(5, 7));
    if (month >= 1 && month <= 12) months.set(month, (months.get(month) ?? 0) + row.count);
  }
  const topMonth = [...months.entries()].sort((a, b) => b[1] - a[1])[0];
  const bait = topBait(rows);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-2xl text-fg">{species}</h3>
        <p className="text-sm text-muted">
          {fish} fish on {rows.length} trip{rows.length === 1 ? "" : "s"}
        </p>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-bg px-3 py-2">
          <dt className="text-xs font-semibold tracking-widest text-accent uppercase">Best length</dt>
          <dd className="text-sm text-fg">
            {longest?.lengthIn != null ? `${longest.lengthIn} in · ${formatPrettyDate(longest.date)}` : "No length logged"}
          </dd>
        </div>
        <div className="rounded-lg bg-bg px-3 py-2">
          <dt className="text-xs font-semibold tracking-widest text-accent uppercase">Best month</dt>
          <dd className="text-sm text-fg">
            {topMonth ? `${MONTHS[topMonth[0] - 1]} · ${topMonth[1]} fish` : "No dated catch"}
          </dd>
        </div>
        <div className="rounded-lg bg-bg px-3 py-2">
          <dt className="text-xs font-semibold tracking-widest text-accent uppercase">Best bait</dt>
          <dd className="text-sm text-fg">{bait ?? "No bait logged"}</dd>
        </div>
      </dl>
    </section>
  );
}

function topBait(rows: CatchRow[]): string | null {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const bait = row.bait.trim();
    if (!bait) continue;
    totals.set(bait, (totals.get(bait) ?? 0) + Math.max(row.count, 1));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
