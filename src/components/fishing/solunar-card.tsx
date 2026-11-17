import { solunarOn } from "@/lib/fishing/solunar";
import { formatClock } from "@/lib/fishing/time";

export function SolunarCard({ date }: { date: string }) {
  const day = solunarOn(date);
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-2xl text-fg">Solunar</h3>
        <p className="text-sm font-semibold text-accent">{day.rating} day</p>
      </div>
      <p className="mt-1 text-sm text-muted">{day.note}</p>
      <ul className="mt-3 space-y-2">
        {day.periods.map((period) => (
          <li key={period.name} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-fg">
              {period.name}
              <span className="ml-2 text-xs font-semibold tracking-widest text-accent uppercase">{period.kind}</span>
            </span>
            <span className="text-fg tabular-nums">
              {clock(period.start)}–{clock(period.end)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function clock(minutes: number): string {
  if (minutes < 0) return `${formatClock(minutes + 1440)} prev`;
  return formatClock(minutes);
}
