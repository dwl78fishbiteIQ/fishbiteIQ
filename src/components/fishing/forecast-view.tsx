import { useEffect, useRef, useState } from "react";
import { ConditionsBar } from "@/components/fishing/conditions-bar";
import { SolunarCard } from "@/components/fishing/solunar-card";
import { getConditions } from "@/lib/fishing/conditions";
import type { Conditions, ConditionsResult } from "@/lib/fishing/types";

export function ForecastView({ initial }: { initial: ConditionsResult }) {
  const [date, setDate] = useState(initial.date);
  const [conditions, setConditions] = useState<Conditions | null>(initial.ok ? initial : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initial.ok ? null : initial.message);
  const cache = useRef(new Map<string, Conditions | "fail">());
  if (initial.ok) cache.current.set(initial.date, initial);
  else cache.current.set(initial.date, "fail");

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
      setError("The forecast didn't answer.");
      setLoading(false);
      return;
    }
    setLoading(true);
    getConditions({ data: { date } })
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
        setError("The forecast didn't answer.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl text-fg">Forecast</h2>
        <p className="text-sm text-muted">Wind, sky, and seas for the day you pick.</p>
      </div>
      <ConditionsBar
        date={date}
        onDate={setDate}
        conditions={conditions}
        loading={loading}
        error={error}
      />
      <SolunarCard date={date} />
    </div>
  );
}
