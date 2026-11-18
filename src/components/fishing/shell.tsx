import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, CloudSun, Compass, Fish, Lightbulb, Map, MapPinned, Menu, TrendingUp, Trophy, Waves, X } from "lucide-react";
import { AdviseView } from "@/components/fishing/advise-view";
import { CatchMap } from "@/components/fishing/catch-map";
import { FishTrends } from "@/components/fishing/fish-trends";
import { ForecastView } from "@/components/fishing/forecast-view";
import { LogBook } from "@/components/fishing/log-book";
import { PersonalBests } from "@/components/fishing/personal-bests";
import { PhotoDesk } from "@/components/fishing/photo-desk";
import { SeasonBoard } from "@/components/fishing/season-board";
import { SpotGuide } from "@/components/fishing/spot-guide";
import { WhyItWorks } from "@/components/fishing/why-it-works";
import { cn } from "@/lib/cn";
import type { ConditionsResult } from "@/lib/fishing/types";
import { speciesFromPhoto } from "@/lib/fishing/import-log";
import { loadPhoto } from "@/lib/fishing/photos";
import { useCatchLog } from "@/lib/fishing/use-log";
import { useWaypoints } from "@/lib/fishing/waypoints";

type View = "advise" | "why" | "bests" | "when" | "trends" | "upload" | "forecast" | "tides" | "log" | "map" | "spots" | "season";

const TIDES_URL =
  "https://charlestonfishing.com/tides/Charleston-8665530?z=12&lat=32.78167&lng=-79.92500";

const NAV: { id: View; label: string; short: string; icon: typeof Fish }[] = [
  { id: "advise", label: "Home", short: "Home", icon: Fish },
  { id: "why", label: "Why it Works", short: "Why", icon: Lightbulb },
  { id: "when", label: "When & Where", short: "When", icon: Compass },
  { id: "trends", label: "Fish Trends", short: "Trends", icon: TrendingUp },
  { id: "map", label: "Map", short: "Map", icon: Map },
  { id: "log", label: "Catch log", short: "Log", icon: BookOpen },
  { id: "bests", label: "Personal bests", short: "Bests", icon: Trophy },
  { id: "tides", label: "Tides", short: "Tides", icon: Waves },
  { id: "forecast", label: "Forecast", short: "Sky", icon: CloudSun },
  { id: "spots", label: "Spots", short: "Spots", icon: MapPinned },
  { id: "season", label: "Season", short: "Season", icon: CalendarDays },
];

export function FishingApp({ initial }: { initial: ConditionsResult }) {
  const log = useCatchLog();
  const marks = useWaypoints();
  const [view, setView] = useState<View>("advise");
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [mapReturn, setMapReturn] = useState<View | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [namingNote, setNamingNote] = useState<string | null>(null);
  const naming = useRef(false);
  const tried = useRef(new Set<string>());

  useEffect(() => {
    if (!log.ready || naming.current) return;
    const pending = log.rows.filter((row) => row.source === "sample" && !row.species && !tried.current.has(row.id));
    if (!pending.length) return;
    naming.current = true;
    void (async () => {
      let named = 0;
      for (const [index, row] of pending.entries()) {
        tried.current.add(row.id);
        setNamingNote(`Naming sample fish ${index + 1} of ${pending.length}…`);
        const photo = await loadPhoto(row.id).catch(() => null);
        if (!photo) continue;
        const result = await speciesFromPhoto(photo);
        if (!result.species) continue;
        log.nameSpecies(row.id, result.species, result.lengthIn);
        named += 1;
      }
      setNamingNote(named ? `Named ${named} sample ${named === 1 ? "catch" : "catches"} from the photos.` : null);
      naming.current = false;
    })();
  }, [log.ready, log.rows]);

  function openLog(id: string, backTo: View | null) {
    setHighlight(id);
    setMapReturn(backTo);
    setView("log");
  }

  function leave(next: View) {
    if (next !== "log") setMapReturn(null);
    setView(next);
    setMenuOpen(false);
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4">
          {view === "advise" ? (
            <h1 className="flex justify-center">
              <img src="/logos/header-logo.png" alt="FishBiteIQ" className="h-28 w-auto sm:h-36" />
            </h1>
          ) : null}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {view === "advise" ? (
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                Mt. Pleasant · Charleston
              </p>
            ) : (
              <>
                <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                  Mt. Pleasant · Charleston
                </p>
                <h1 className="mt-1 text-3xl leading-tight text-fg md:text-4xl">FishBiteIQ</h1>
              </>
            )}
            <p className="mt-1 max-w-xl text-sm text-muted">
              Ranks a spot and a tide from your catch log and the forecast. Thin data stays
              labeled as general.
            </p>
            {namingNote ? <p className="mt-1 text-sm text-accent">{namingNote}</p> : null}
          </div>
          <nav className="relative flex items-center gap-1" aria-label="Sections">
            <NavButton item={NAV[0]} active={view === NAV[0].id} onClick={() => leave(NAV[0].id)} />
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex size-11 items-center justify-center rounded-lg text-fg hover:bg-surface"
            >
              {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
            {menuOpen ? (
              <div className="absolute top-12 right-0 z-20 flex w-56 flex-col rounded-xl border border-border bg-surface p-1 shadow-lg">
                {NAV.slice(1).map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={view === item.id}
                    onClick={() => leave(item.id)}
                    className="w-full justify-start"
                    menu
                  />
                ))}
              </div>
            ) : null}
          </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4 pb-10">
        {view === "advise" || view === "when" ? (
          <AdviseView
            initial={initial}
            rows={log.rows}
            sampleOnly={log.sampleOnly}
            screen={view === "when" ? "when" : "home"}
            onShowPlan={() => setView("when")}
            onAdd={log.add}
            onOpenUpload={(file) => {
              setPhotoFile(file);
              setView("upload");
            }}
            onOpenTrip={(id) => openLog(id, null)}
            onOpenMapTrip={(id) => openLog(id, "map")}
            waypoints={marks.waypoints}
          />
        ) : null}
        {view === "upload" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setPhotoFile(null);
                setView("advise");
              }}
              className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
            >
              Back to home
            </button>
            <PhotoDesk
              key={photoFile ? `${photoFile.name}-${photoFile.lastModified}` : "new"}
              initialFile={photoFile}
              onAdd={log.add}
              onRecommend={() => undefined}
              onCancel={() => {
                setPhotoFile(null);
                setView("advise");
              }}
              onLogged={() => {
                setPhotoFile(null);
                setView("advise");
              }}
            />
          </div>
        ) : null}
        {view === "why" ? <WhyItWorks /> : null}
        {view === "bests" ? <PersonalBests rows={log.rows} /> : null}
        {view === "forecast" ? <ForecastView initial={initial} /> : null}
        {view === "trends" ? <FishTrends rows={log.rows} waypoints={marks.waypoints} /> : null}
        {view === "tides" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl text-fg">Tides</h2>
                <p className="text-sm text-muted">Charleston tide chart.</p>
              </div>
              <a
                href={TIDES_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent underline"
              >
                Open the chart
              </a>
            </div>
            <iframe
              title="Charleston tides"
              src={TIDES_URL}
              className="h-[70vh] w-full rounded-xl border border-border bg-white"
            />
          </div>
        ) : null}
        {view === "log" ? (
          <LogBook
            rows={log.rows}
            highlight={highlight}
            sampleOnly={log.sampleOnly}
            onAdd={log.add}
            onRestore={log.restoreSample}
            onClear={log.clear}
            onReplace={log.replace}
            onReplaceWaypoints={marks.replace}
            waypoints={marks.waypoints}
            onBack={() => {
              setHighlight(null);
              setMapReturn(null);
              setView("map");
            }}
          />
        ) : null}
        {view === "map" ? (
          <CatchMap
            rows={log.rows}
            waypoints={marks.waypoints}
            onOpenTrip={(id) => openLog(id, "map")}
            onSaveWaypoint={marks.save}
            onDeleteWaypoint={marks.remove}
          />
        ) : null}
        {view === "spots" ? <SpotGuide /> : null}
        {view === "season" ? <SeasonBoard rows={log.rows} /> : null}
      </main>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
  className,
  menu,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  onClick: () => void;
  className?: string;
  menu?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap",
        active
          ? menu
            ? "bg-bg text-accent"
            : "bg-surface text-accent"
          : menu
            ? "text-muted hover:bg-bg hover:text-fg"
            : "text-muted hover:bg-surface hover:text-fg",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {item.label}
    </button>
  );
}
