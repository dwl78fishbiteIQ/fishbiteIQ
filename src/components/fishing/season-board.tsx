import { useMemo, useState } from "react";
import { notesForMonth } from "@/lib/fishing/seasons";
import { monthOf, MONTHS, todayInCharleston } from "@/lib/fishing/time";
import type { CatchRow, Species } from "@/lib/fishing/types";
import { cn } from "@/lib/cn";

export function SeasonBoard({ rows }: { rows: CatchRow[] }) {
  const current = Number(todayInCharleston().slice(5, 7));
  const [month, setMonth] = useState(current);
  const notes = notesForMonth(month);
  const monthRows = useMemo(() => rows.filter((r) => monthOf(r.date) === month), [rows, month]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl text-fg">Seasonal notes</h2>
        <p className="max-w-2xl text-sm text-muted">
          What usually shows up, next to what this catch log actually recorded. If the catch log is
          empty for a fish, the note is general.
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MONTHS.map((name, index) => {
          const value = index + 1;
          const active = value === month;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setMonth(value)}
              className={cn(
                "h-11 shrink-0 rounded-lg px-3 text-sm font-medium",
                active ? "bg-accent text-accent-fg" : "bg-surface text-muted",
              )}
            >
              {name.slice(0, 3)}
              {value === current ? " · now" : ""}
            </button>
          );
        })}
      </div>
      <ul className="space-y-3">
        {notes.map((note) => (
          <SeasonRow key={note.species} species={note.species} text={note.text} rows={monthRows} />
        ))}
      </ul>
    </div>
  );
}

function SeasonRow({
  species,
  text,
  rows,
}: {
  species: Species;
  text: string;
  rows: CatchRow[];
}) {
  const mine = rows.filter((r) => r.species === species);
  const fish = mine.reduce((sum, row) => sum + row.count, 0);
  const backed = mine.length > 0;
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl text-fg">{species}</h3>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-semibold uppercase",
            backed ? "border-accent text-accent" : "border-border text-muted",
          )}
        >
          {backed ? "Catch log" : "General"}
        </span>
      </div>
      <p className="mt-2 text-sm text-fg">{text}</p>
      <p className="mt-2 text-sm text-muted tabular-nums">
        {backed
          ? `${mine.length} trips this month in the catch log, ${fish} fish.`
          : "No trips for this fish in this month."}
      </p>
    </li>
  );
}
