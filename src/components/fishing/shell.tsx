import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, CloudSun, Compass, Fish, Info, Lightbulb, Map, MapPinned, Menu, TrendingUp, Trophy, Waves, X } from "lucide-react";
import { AboutApp } from "@/components/fishing/about-app";
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

type View = "advise" | "why" | "bests" | "when" | "trends" | "upload" | "forecast" | "tides" | "log" | "map" | "spots" | "season" | "about";

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
  { id: "about", label: "About FishBiteIQ", short: "About", icon: Info },
];

export function FishingApp({ initial }: { initial: ConditionsResult }) {
  const log = useCatchLog();
  const marks = useWaypoints();
  const [view, setView] = useState<View>("advise");
  const [menuOpen, setMenuOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [installHidden, setInstallHidden] = useState(false);
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

  useEffect(() => {
    try {
      if (localStorage.getItem("lfa-hide-install") === "1") {
        setInstallHidden(true);
        return;
      }
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (standalone) return;
    } catch {
      return;
    }
    setInstallOpen(true);
  }, []);

  function hideInstallForever() {
    try {
      localStorage.setItem("lfa-hide-install", "1");
    } catch {
      /* the popup can still close */
    }
    setInstallHidden(true);
    setInstallOpen(false);
  }

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
          <h1 className="flex justify-center">
            <img src="/logos/header-logo.png" alt="FishBiteIQ" className="h-[6.3rem] w-auto sm:h-[8.1rem]" />
          </h1>
          {installHidden ? null : (
            <div className="-my-2 flex justify-center">
              <button
                type="button"
                onClick={() => setInstallOpen(true)}
                className="rounded-md border-2 border-accent bg-danger px-3 py-1 font-display text-sm font-semibold tracking-wide text-white shadow-[0_6px_14px_rgb(196_54_44/0.28)] transition duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_18px_rgb(196_54_44/0.4)] active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:transform-none"
              >
                Add FishBiteIQ App to your phone
              </button>
            </div>
          )}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="max-w-xl text-sm text-muted">
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

      {installOpen ? <InstallPopup onClose={() => setInstallOpen(false)} onNever={hideInstallForever} /> : null}

      <main className="mx-auto max-w-5xl px-4 pt-4 pb-10">
        {view === "advise" || view === "when" ? (
          <AdviseView
            initial={initial}
            rows={log.rows}
            sampleOnly={log.sampleOnly}
            screen={view === "when" ? "when" : "home"}
            onShowPlan={() => setView("when")}
            onHome={() => setView("advise")}
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
              waypoints={marks.waypoints}
              onSaveSpot={marks.save}
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
        {view === "about" ? <AboutApp /> : null}
      </main>
      <footer className="flex items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <img src="/logos/header-logo.png" alt="" className="h-[1em] w-auto shrink-0" />
        <span className="text-center">© FishbiteIQ, LLC - 2026</span>
        <img src="/logos/header-logo.png" alt="" className="h-[1em] w-auto shrink-0" />
      </footer>
    </div>
  );
}

function InstallPopup({ onClose, onNever }: { onClose: () => void; onNever: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="max-h-[85dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-4 text-sm"
      >
        <h2 id="install-title" className="text-2xl text-fg">
          Add FishBiteIQ App to your phone
        </h2>
        <div>
          <h3 className="text-base text-fg">iPhone</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
            <li>Open this site in Safari. Chrome on an iPhone cannot add it.</li>
            <li>Tap the Share button, the square with the arrow.</li>
            <li>Scroll down and tap Add to Home Screen.</li>
            <li>Tap Add. The FishBiteIQ icon then opens like an app.</li>
          </ol>
        </div>
        <div>
          <h3 className="text-base text-fg">Android</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
            <li>Open this site in Chrome.</li>
            <li>Tap the menu, the three dots at the top.</li>
            <li>Tap Install app, or Add to Home screen.</li>
            <li>Tap Install. The FishBiteIQ icon then opens like an app.</li>
          </ol>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onNever}
            className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
          >
            Don't show this to me again
          </button>
        </div>
      </section>
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
