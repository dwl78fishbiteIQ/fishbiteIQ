import { useEffect, useRef, useState, type FormEvent } from "react";
import { AdviceCard } from "@/components/fishing/advice-card";
import { BiteCalendar } from "@/components/fishing/bite-calendar";
import { CatchMap } from "@/components/fishing/catch-map";
import { PhotoDesk } from "@/components/fishing/photo-desk";
import { advise, commonName, parseAsk, whenQuery, type Query } from "@/lib/fishing/advisor";
import { liveConditions } from "@/lib/fishing/live";
import { todayInCharleston } from "@/lib/fishing/time";
import type { Advice, Area, CatchRow, Conditions, ConditionsResult, Species } from "@/lib/fishing/types";
import type { Waypoint } from "@/lib/fishing/waypoints";

type Turn = {
  id: string;
  prompt: string;
  advice: Advice | null;
  pending: string | null;
};

export function AdviseView({
  initial,
  rows,
  sampleOnly,
  screen,
  onShowPlan,
  onAdd,
  onOpenUpload,
  onOpenTrip,
  onOpenMapTrip,
  waypoints,
}: {
  initial: ConditionsResult;
  rows: CatchRow[];
  sampleOnly: boolean;
  screen: "home" | "when";
  onShowPlan: () => void;
  onAdd: (row: CatchRow) => void;
  onOpenUpload: (file: File) => void;
  onOpenTrip: (id: string) => void;
  onOpenMapTrip: (id: string) => void;
  waypoints: Waypoint[];
}) {
  const today = todayInCharleston();
  const startDate = initial.date;
  const [date, setDate] = useState(startDate);
  const [species, setSpecies] = useState<Species | "">("Red Drum");
  const [area, setArea] = useState<Area | "">("");
  const [plan, setPlan] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conditions, setConditions] = useState<Conditions | null>(initial.ok ? initial : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initial.ok ? null : initial.message);
  const cache = useRef(new Map<string, Conditions | "fail">());
  if (initial.ok) cache.current.set(initial.date, initial);
  else cache.current.set(initial.date, "fail");
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const marksRef = useRef(waypoints);
  marksRef.current = waypoints;

  useEffect(() => {
    let cancelled = false;
    const cached = cache.current.get(date);
    if (cached && cached !== "fail") {
      setConditions(cached);
      setError(null);
      setLoading(false);
      return;
    }
    if (cached === "fail") {
      setConditions(null);
      setError("The tide station didn't answer. I can still use the catch log.");
      setLoading(false);
      return;
    }
    setLoading(true);
    liveConditions(date)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          cache.current.set(date, result);
          setConditions(result);
          setError(null);
        } else {
          cache.current.set(date, "fail");
          setConditions(null);
          setError(result.message);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setConditions(null);
        setError("The tide station didn't answer. I can still use the catch log.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function ensure(d: string): Promise<Conditions | null> {
    const cached = cache.current.get(d);
    if (cached && cached !== "fail") return cached;
    if (cached === "fail") return null;
    try {
      const result = await liveConditions(d);
      if (result.ok) {
        cache.current.set(d, result);
        return result;
      }
      cache.current.set(d, "fail");
      return null;
    } catch {
      return null;
    }
  }

  async function submit(prompt: string, preset?: Query) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const query = preset ?? (screen === "when" ? whenQuery(trimmed, today) : parseAsk(trimmed, today));
    const asked =
      query.kind === "predict" && screen === "when" ? { ...query, includeBait: true } : query;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setTurns((current) => [
      { id, prompt: trimmed, advice: null, pending: "Checking the catch log…" },
      ...current,
    ]);
    if (asked.kind === "photo") {
      document.getElementById("photo-desk")?.scrollIntoView({ block: "start" });
    }
    let cond: Conditions | null = null;
    if (asked.kind === "predict" || asked.kind === "when") {
      if (asked.kind === "predict") setDate(asked.date);
      cond = await ensure(asked.date);
    }
    const advice = advise(asked, rowsRef.current, cond, today, marksRef.current);
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? { ...turn, advice, pending: null } : turn)),
    );
  }

  function askPlan(event: FormEvent) {
    event.preventDefault();
    const typed = plan.trim();
    if (!typed) return;
    void submit(typed, whenQuery(typed, today));
    setPlan("");
  }

  const planAsk = (
    <>
      <form className="rounded-xl border border-border bg-surface p-4" onSubmit={askPlan}>
        <label className="text-sm text-muted" htmlFor={screen === "home" ? "plan-home" : "plan"}>
          Ask for a time and a place
          <input
            id={screen === "home" ? "plan-home" : "plan"}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Best time and place Saturday for redfish?"
            className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg"
          />
        </label>
        <button
          type="submit"
          className="mt-3 h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
        >
          Find a time and place
        </button>
      </form>
      {turns.map((turn) => (
        <AdviceCard
          key={turn.id}
          prompt={turn.prompt}
          advice={turn.advice}
          pending={turn.pending}
          onAsk={(prompt) => void submit(prompt)}
          onOpenTrip={onOpenTrip}
        />
      ))}
    </>
  );

  return (
    <div className="space-y-4">
      {screen === "home" ? (
        <>
          <PhotoDesk
            launch
            onOpenUpload={onOpenUpload}
            onAdd={onAdd}
            onRecommend={(setting, fish) => {
              const query: Query = {
                kind: "predict",
                date: today,
                species: fish,
                area: null,
                spotId: null,
                setting,
                assumedDate: false,
              };
              const name = fish ? commonName(fish) : "whatever the photo suggests";
              void submit(`Is this worth fishing for ${name} today?`, query);
              onShowPlan();
            }}
          />

          <section className="space-y-3">
            <div>
              <h2 className="text-2xl text-fg">When & Where</h2>
              <p className="text-sm text-muted">
                Ask in your own words. The answer uses your catch log and the forecast for the day
                you name.
              </p>
            </div>
            {planAsk}
          </section>

          <BiteCalendar rows={rows} />

          <CatchMap rows={rows} compact onOpenTrip={onOpenMapTrip} />

          {sampleOnly ? (
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
              A sample catch log is loaded so the advice has records to cite. Add your own trips in
              the catch log — they're saved on this device.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div>
            <h2 className="text-3xl text-fg">When & Where</h2>
            <p className="text-sm text-muted">
              Ask in your own words. The answer uses your catch log and the forecast for the day
              you name: wind, water, pressure, clouds, waves, tide, and moon.
            </p>
          </div>

          <form
            className="rounded-xl border border-border bg-surface p-4"
            onSubmit={askPlan}
          >
            <label className="text-sm text-muted" htmlFor="plan">
              Ask for a time and a place
              <input
                id="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="Best time and place Saturday for redfish?"
                className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg"
              />
            </label>
            <button
              type="submit"
              className="mt-3 h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
            >
              Find a time and place
            </button>
          </form>

          {turns.map((turn) => (
            <AdviceCard
              key={turn.id}
              prompt={turn.prompt}
              advice={turn.advice}
              pending={turn.pending}
              onAsk={(prompt) => void submit(prompt)}
              onOpenTrip={onOpenTrip}
            />
          ))}

          <p className="text-xs text-muted">
            Weather and seas from Open-Meteo. Not a substitute for the forecast or the regulations.
          </p>
        </>
      )}
    </div>
  );
}
