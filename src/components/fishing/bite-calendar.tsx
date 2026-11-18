import { useEffect, useState } from "react";
import { biteOutlook, type BiteOutlook } from "@/lib/fishing/advisor";
import { liveConditions, livePublicReports } from "@/lib/fishing/live";
import { publicOnlyOutlook, withPublicReports, type PublicPulse } from "@/lib/fishing/public-reports";
import { addDays, todayInCharleston } from "@/lib/fishing/time";
import type { CatchRow, Conditions } from "@/lib/fishing/types";
import { cn } from "@/lib/cn";
import flame from "@/assets/hot-flame.jpg";

export function BiteCalendar({ rows }: { rows: CatchRow[] }) {
  const today = todayInCharleston();
  const dates = Array.from({ length: 5 }, (_, index) => addDays(today, index));
  const [conditions, setConditions] = useState<Record<string, Conditions | null>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [reports, setReports] = useState<PublicPulse | null>(null);
  const [source, setSource] = useState<HookSource>("log");

  useEffect(() => {
    let dead = false;
    for (const date of dates) {
      void liveConditions(date)
        .then((result) => {
          if (dead) return;
          setConditions((current) => ({ ...current, [date]: result.ok ? result : null }));
        })
        .catch(() => {
          if (!dead) setConditions((current) => ({ ...current, [date]: null }));
        });
    }
    return () => {
      dead = true;
    };
    // The week starts from today and does not change while this view is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  useEffect(() => {
    let dead = false;
    void livePublicReports()
      .then((pulse) => {
        if (!dead) setReports(pulse);
      })
      .catch(() => {
        if (!dead) setReports(null);
      });
    return () => {
      dead = true;
    };
  }, []);

  const opened = open && open in conditions ? scoreDay(open) : null;

  function scoreDay(date: string): BiteOutlook | null {
    if (!(date in conditions)) return null;
    const base = biteOutlook(source === "reports" ? [] : rows, conditions[date] ?? null, date);
    if (source === "log") return base;
    if (source === "both") return withPublicReports(base, reports, conditions[date] ?? null);
    return publicOnlyOutlook(base, reports, conditions[date] ?? null);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-3xl text-fg">5-Day Hook Up Forecast</h2>
      <p className="mt-1 text-sm text-muted">
        {source === "reports"
          ? "Scored from Haddrell's Point, the other Charleston reports, the tide, and the forecast. The catch log is not used."
          : source === "both"
            ? "Scored from your catch log, Haddrell's Point, the other Charleston reports, the tide, and the forecast."
            : "Scored from your catch log, the Charleston tide, and the forecast."}
      </p>
      <fieldset className="mt-3 flex flex-wrap gap-2">
        <legend className="sr-only">Score the forecast from the catch log, public fishing reports, or both</legend>
        {(
          [
            ["log", "Catch log"],
            ["both", "Catch log + Public Fishing Reports"],
            ["reports", "Public Fishing Reports"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              source === value ? "border-accent bg-bg font-semibold text-fg" : "border-border text-muted",
            )}
          >
            <input type="radio" name="hookup-source" checked={source === value} onChange={() => setSource(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {dates.map((date) => {
          const known = date in conditions;
          const outlook = scoreDay(date);
          const hot = outlook?.grade === "Hot";
          const bits = dayBits(date);
          return (
            <div
              key={date}
              className={cn(
                "relative overflow-hidden rounded-lg border bg-bg",
                date === open ? "border-accent" : "border-border",
              )}
            >
              {hot ? (
                <img
                  src={flame}
                  alt=""
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 w-full object-cover opacity-40 mix-blend-screen"
                />
              ) : null}
              <div className={cn("relative px-1 py-1 text-center leading-tight", bannerClass(outlook?.grade))}>
                {outlook ? outlook.grade : "…"}
              </div>
              <div className="relative px-1 py-2 text-center">
                <span className="block text-[10px] font-semibold tracking-widest text-muted uppercase">{bits.weekday}</span>
                <span className="block text-lg text-fg">
                  {bits.day}
                  {outlook?.grade === "Good" ? <span className="ml-1">👍</span> : null}
                </span>
                <span className="mt-1 block text-[10px] leading-tight text-fg">{outlook?.window ?? (known ? "—" : "")}</span>
                {outlook ? (
                  <button
                    type="button"
                    onClick={() => setOpen((current) => (current === date ? null : date))}
                    className="mt-1 text-[10px] text-accent underline"
                  >
                    Reason
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {opened ? <p className="mt-3 text-sm text-fg">{opened.summary}</p> : null}
      {source !== "log" && reports ? (
        <p className="mt-2 text-sm text-muted">
          Reports:{" "}
          {reports.sources.map((source, index) => (
            <span key={source.url}>
              {index ? " · " : ""}
              <a href={source.url} target="_blank" rel="noreferrer" className="text-accent underline">
                {source.name}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}

type HookSource = "log" | "both" | "reports";

function dayBits(iso: string): { weekday: string; day: string } {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    weekday: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(date),
    day: String(day),
  };
}

function bannerClass(grade: BiteOutlook["grade"] | undefined): string {
  if (grade === "Hot") return "bg-red-700 text-sm font-black tracking-wide text-white";
  if (grade === "Good") return "bg-go text-sm font-black tracking-wide text-black";
  if (grade === "Stay ashore") return "bg-red-950 text-[10px] font-bold text-red-200";
  if (grade === "Slow") return "bg-bg text-[10px] font-semibold text-muted";
  return "bg-surface-2 text-[10px] font-semibold text-fg";
}
