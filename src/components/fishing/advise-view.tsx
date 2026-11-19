import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic } from "lucide-react";
import { AdviceCard } from "@/components/fishing/advice-card";
import { BiteCalendar } from "@/components/fishing/bite-calendar";
import { CatchMap } from "@/components/fishing/catch-map";
import { PhotoDesk } from "@/components/fishing/photo-desk";
import { advise, commonName, parseAsk, whenQuery, type Query } from "@/lib/fishing/advisor";
import { liveConditions, livePublicReports } from "@/lib/fishing/live";
import { applyReports } from "@/lib/fishing/public-reports";
import { todayInCharleston } from "@/lib/fishing/time";
import type { Advice, Area, CatchRow, Conditions, ConditionsResult, Species } from "@/lib/fishing/types";
import type { Waypoint } from "@/lib/fishing/waypoints";

type Turn = {
  id: string;
  prompt: string;
  advice: Advice | null;
  pending: string | null;
};

function predictionText(prompt: string, advice: Advice): string {
  const picks = advice.picks.map((pick) =>
    [pick.place, pick.windowLabel, pick.waterway, pick.landing ? `Closest landing: ${pick.landing}` : "", pick.why]
      .filter(Boolean)
      .join("\n"),
  );
  return ["FishBiteIQ", prompt, advice.headline, advice.lede, advice.safety, ...picks].filter(Boolean).join("\n\n");
}

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechHeard) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechHeard = {
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
};

function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function queryAfterWake(said: string): string | null {
  const match = said.match(/hey\s+fish\s*bite(?:\s+i\s*\.?\s*q)?/i);
  if (!match || match.index == null) return null;
  return said.slice(match.index + match[0].length).replace(/^[\s,.:;-]+/, "").trim();
}

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
  onHome,
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
  onHome: () => void;
  waypoints: Waypoint[];
}) {
  const today = todayInCharleston();
  const startDate = initial.date;
  const [date, setDate] = useState(startDate);
  const [species, setSpecies] = useState<Species | "">("Red Drum");
  const [area, setArea] = useState<Area | "">("");
  const [plan, setPlan] = useState("");
  const [hearing, setHearing] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const hearingRef = useRef(false);
  const recRef = useRef<SpeechRec | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
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
  const heardRef = useRef("");

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
      {
        id,
        prompt: trimmed,
        advice: null,
        pending:
          asked.kind === "predict" || asked.kind === "when"
            ? "Checking the catch log and fishing reports…"
            : "Checking the catch log…",
      },
      ...current,
    ]);
    if (asked.kind === "predict" || asked.kind === "when") {
      setResultOpen(true);
      setShareNote(null);
    }
    if (asked.kind === "photo") {
      document.getElementById("photo-desk")?.scrollIntoView({ block: "start" });
    }
    let cond: Conditions | null = null;
    if (asked.kind === "predict" || asked.kind === "when") {
      if (asked.kind === "predict") setDate(asked.date);
      cond = await ensure(asked.date);
    }
    let advice = advise(asked, rowsRef.current, cond, today, marksRef.current);
    if (asked.kind === "predict" || asked.kind === "when") {
      advice = applyReports(advice, await livePublicReports(), cond);
    }
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

  function stopVoice() {
    hearingRef.current = false;
    setHearing(false);
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* already stopped */
    }
  }

  function startDictation() {
    const Ctor = speechCtor();
    if (!Ctor) {
      setVoiceNote("This phone can't hear a question in the browser. Type it instead.");
      return;
    }
    stopVoice();
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    recRef.current = rec;
    hearingRef.current = true;
    setHearing(true);
    setVoiceNote("Listening…");
    rec.onresult = (event) => {
      let said = "";
      let final = false;
      for (let i = 0; i < event.results.length; i += 1) {
        said += event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) final = true;
      }
      const text = said.trim();
      if (!text) return;
      setPlan(text);
      if (!final || text.length < 3) return;
      setVoiceNote(`Heard: ${text}`);
      stopVoice();
      void submit(text, whenQuery(text, today));
      setPlan("");
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceNote("The microphone is blocked. Allow it, or type the question.");
        stopVoice();
      }
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      stopVoice();
    };
    try {
      rec.start();
    } catch {
      setVoiceNote("The microphone didn't start. Type the question instead.");
      stopVoice();
    }
  }

  function rememberQuery(text: string) {
    heardRef.current = text;
    setPlan(text);
  }

  function spokenQuery(said: string): string {
    const after = queryAfterWake(said);
    if (after != null) return after;
    return said.replace(/hey\s+fish\s*bite(?:\s+i\s*\.?\s*q)?[\s,.:;-]*/i, "").trim();
  }

  function stopAndSearch() {
    const text = heardRef.current.trim();
    stopVoice();
    if (text.length < 3) {
      setVoiceNote("Nothing to search yet. Say the question, then tap the microphone again.");
      return;
    }
    setVoiceNote(null);
    void submit(text, whenQuery(text, today));
    rememberQuery("");
  }

  function startVoice() {
    const Ctor = speechCtor();
    if (!Ctor) {
      setVoiceNote("This phone can't hear a question in the browser. Type it instead.");
      return;
    }
    stopVoice();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recRef.current = rec;
    hearingRef.current = true;
    setHearing(true);
    setVoiceNote("Listening… tap the microphone again to search.");
    let prefix = "";
    rec.onresult = (event) => {
      let said = "";
      for (let i = 0; i < event.results.length; i += 1) {
        said += event.results[i][0]?.transcript ?? "";
      }
      const question = spokenQuery(said);
      if (!question) return;
      rememberQuery(`${prefix} ${question}`.trim());
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceNote("The microphone is blocked. Allow it, or type the question.");
        stopVoice();
      }
    };
    rec.onend = () => {
      prefix = heardRef.current;
      if (!hearingRef.current || recRef.current !== rec) return;
      window.setTimeout(() => {
        if (!hearingRef.current || recRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          /* the browser is still starting */
        }
      }, 300);
    };
    try {
      rec.start();
    } catch {
      setVoiceNote("The microphone didn't start. Type the question instead.");
      stopVoice();
    }
  }

  useEffect(() => () => stopVoice(), []);

  const planAsk = (
    <>
      <form className="rounded-xl border border-border bg-surface p-4" onSubmit={askPlan}>
        <label className="text-sm text-muted" htmlFor={screen === "home" ? "plan-home" : "plan"}>
          Ask for a time and a place
        </label>
        <span className="relative mt-1 block">
          <input
            id={screen === "home" ? "plan-home" : "plan"}
            value={plan}
            onChange={(e) => rememberQuery(e.target.value)}
            placeholder="Best time and place Saturday for redfish?"
            className="h-11 w-full rounded-lg border border-border bg-bg py-0 pr-28 pl-11 text-base text-fg"
          />
          <button
            type="button"
            aria-label={hearing ? "Stop listening and search" : "Ask with the microphone"}
            aria-pressed={hearing}
            onClick={hearing ? stopAndSearch : startVoice}
            className="absolute top-1/2 left-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-accent"
          >
            <Mic className="size-5" aria-hidden="true" />
          </button>
          <button
            type="submit"
            className="absolute top-1/2 right-1 h-8 -translate-y-1/2 rounded-md bg-accent px-3 text-sm font-semibold text-accent-fg"
          >
            Continue
          </button>
        </span>
        {screen === "home" && voiceNote ? <p className="mt-2 text-sm text-muted">{voiceNote}</p> : null}
      </form>
    </>
  );

  async function sharePrediction(turn: Turn) {
    if (!turn.advice) return;
    const text = predictionText(turn.prompt, turn.advice);
    try {
      if (navigator.share) {
        await navigator.share({ title: "FishBiteIQ", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote("Copied. Paste it into a text or email.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareNote("That prediction could not be shared.");
    }
  }

  function closePrediction() {
    setResultOpen(false);
    setShareNote(null);
    onHome();
  }

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

          <section className="space-y-3 rounded-xl border-2 border-accent p-4">
            <h2 className="text-center font-display text-3xl leading-none font-semibold">
              <span className="text-white [-webkit-text-stroke:0.6px_#c47a32] [paint-order:stroke_fill]">Guide me FishBite</span>
              <span className="text-accent [-webkit-text-stroke:0.6px_#1a1208] [paint-order:stroke_fill]">IQ...</span>
              <span className="text-white [-webkit-text-stroke:0.6px_#c47a32] [paint-order:stroke_fill]"> . . .</span>
            </h2>
            <p className="text-sm text-muted">
              Ask in your own words. The answer uses your catch log and the forecast for the day
              you name.
            </p>
            {planAsk}
          </section>

          <BiteCalendar rows={rows} />

          {sampleOnly ? (
            <p className="rounded-xl border-2 border-accent bg-surface p-4 text-sm text-muted">
              A sample catch log is loaded so the advice has records to cite. Add your own trips in
              the catch log — they're saved on this device.
            </p>
          ) : null}

          <div className="rounded-xl border-2 border-accent p-4">
            <CatchMap rows={rows} compact onOpenTrip={onOpenMapTrip} />
          </div>
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
            </label>
            <span className="relative mt-1 block">
              <input
                id="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="Best time and place Saturday for redfish?"
                className="h-11 w-full rounded-lg border border-border bg-bg py-0 pr-28 pl-11 text-base text-fg"
              />
              <button
                type="button"
                aria-label={hearing ? "Stop the microphone" : "Ask with the microphone"}
                aria-pressed={hearing}
                onClick={hearing ? stopVoice : startDictation}
                className="absolute top-1/2 left-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-accent"
              >
                <Mic className="size-5" aria-hidden="true" />
              </button>
              <button
                type="submit"
                className="absolute top-1/2 right-1 h-8 -translate-y-1/2 rounded-md bg-accent px-3 text-sm font-semibold text-accent-fg"
              >
                Continue
              </button>
            </span>
            {voiceNote ? <p className="mt-2 text-sm text-muted">{voiceNote}</p> : null}
          </form>

          <p className="text-xs text-muted">
            Weather and seas from Open-Meteo. Not a substitute for the forecast or the regulations.
          </p>
        </>
      )}
      {resultOpen && turns[0] ? (
        <PredictionWindow
          turn={turns[0]}
          note={shareNote}
          onAsk={(prompt) => void submit(prompt)}
          onOpenTrip={onOpenTrip}
          onShare={() => void sharePrediction(turns[0])}
          onClose={closePrediction}
        />
      ) : null}
    </div>
  );
}

function PredictionWindow({
  turn,
  note,
  onAsk,
  onOpenTrip,
  onShare,
  onClose,
}: {
  turn: Turn;
  note: string | null;
  onAsk: (prompt: string) => void;
  onOpenTrip: (id: string) => void;
  onShare: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="prediction-title"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-bg"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id="prediction-title" className="text-2xl text-fg">
            When & Where
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!turn.advice}
              onClick={onShare}
              className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
            >
              Share
            </button>
            <button type="button" onClick={onClose} className="h-11 rounded-lg border border-border px-4 text-sm text-fg">
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <AdviceCard
            prompt={turn.prompt}
            advice={turn.advice}
            pending={turn.pending}
            onAsk={onAsk}
            onOpenTrip={onOpenTrip}
          />
          {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
        </div>
      </section>
    </div>
  );
}
