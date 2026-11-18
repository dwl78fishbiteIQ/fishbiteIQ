import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { logRowPreview } from "@/lib/fishing/advisor";
import { exportBackup, installBackup, readBackup } from "@/lib/fishing/backup";
import { moonOn } from "@/lib/fishing/moon";
import { meteoLines } from "@/lib/fishing/photo-weather";
import { filesFromUpload, rowFromPhoto, shrinkPhoto, speciesFromPhoto } from "@/lib/fishing/import-log";
import { EMPTY_FILTER, filterRows, type LogFilter } from "@/lib/fishing/log-filter";
import { clearPhotos, loadPhoto, savePhoto } from "@/lib/fishing/photos";
import { spotById } from "@/lib/fishing/spots";
import { liveConditions } from "@/lib/fishing/live";
import { hoursAfterTurn, noaaPhotoLink, tidePhrase } from "@/lib/fishing/station";
import { clockToMinutes, formatPrettyDate, todayInCharleston } from "@/lib/fishing/time";
import type { CatchRow, Species, TideStage, WindDir } from "@/lib/fishing/types";
import { SPECIES, TIDE_STAGES, WIND_DIRS } from "@/lib/fishing/types";
import type { Waypoint } from "@/lib/fishing/waypoints";
import { LogFilterBar } from "@/components/fishing/log-filters";
import { BaitPicker } from "@/components/fishing/bait-picker";
import { cn } from "@/lib/cn";

const field =
  "h-11 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg md:text-sm";

export function LogBook({
  rows,
  highlight,
  sampleOnly,
  onAdd,
  onRestore,
  onClear,
  onReplace,
  onReplaceWaypoints,
  waypoints,
  onBack,
}: {
  rows: CatchRow[];
  highlight: string | null;
  sampleOnly: boolean;
  onAdd: (row: CatchRow) => void;
  onRestore: () => void;
  onClear: () => void;
  onReplace: (rows: CatchRow[]) => void;
  onReplaceWaypoints: (waypoints: Waypoint[]) => void;
  waypoints: Waypoint[];
  onBack?: () => void;
}) {
  const [filter, setFilter] = useState<LogFilter>(EMPTY_FILTER);
  const [openSpecies, setOpenSpecies] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedGuide, setClearedGuide] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const backupInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => filterRows(rows, filter, waypoints), [rows, filter, waypoints]);
  const groups = useMemo(() => {
    const names: Array<Species | ""> = [...SPECIES, ""];
    return names
      .map((name) => ({
        name,
        rows: shown.filter((row) => (row.species || "") === name),
      }))
      .filter((group) => group.rows.length);
  }, [shown]);

  useEffect(() => {
    if (!highlight) return;
    setFilter(EMPTY_FILTER);
    setOpenId(highlight);
    const row = rows.find((item) => item.id === highlight);
    setOpenSpecies(row?.species || "");
  }, [highlight, rows]);

  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`trip-${highlight}`)?.scrollIntoView({ block: "center" });
  }, [highlight, shown.length, openSpecies]);

  async function importSample(list: FileList) {
    setImportNote("Reading photos…");
    try {
      const files = await filesFromUpload(list);
      if (!files.length) {
        setImportNote("No photos found in that file.");
        return;
      }
      const rows: CatchRow[] = [];
      let missingGps = 0;
      try {
        await clearPhotos();
      } catch {
        /* the book can still update if photo storage is blocked */
      }
      for (const [index, file] of files.entries()) {
        const row = await rowFromPhoto(file, index);
        if (row.lat == null || row.lng == null) missingGps += 1;
        setImportNote(`Naming the fish ${index + 1} of ${files.length}…`);
        try {
          const preview = await shrinkPhoto(file);
          await savePhoto(row.id, preview);
          const named = await speciesFromPhoto(preview);
          if (named.species) {
            row.species = named.species;
            row.lengthIn = named.lengthIn;
          }
        } catch {
          /* keep the row even if the preview fails */
        }
        rows.push(row);
      }
      onReplace(rows);
      setImportNote(
        `Loaded ${rows.length} photo${rows.length === 1 ? "" : "s"}.${missingGps ? ` ${missingGps} had no GPS.` : ""}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setImportNote(message || "That zip could not be read.");
    }
  }

  async function importBackup(file: File) {
    setImportNote("Reading the backup…");
    try {
      const backup = await readBackup(file);
      await installBackup(backup);
      onReplace(backup.trips);
      onReplaceWaypoints(backup.waypoints);
      setImportNote(
        `Restored ${backup.trips.length} trip${backup.trips.length === 1 ? "" : "s"} and ${backup.waypoints.length} waypoint${backup.waypoints.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setImportNote(message || "That backup could not be read.");
    }
  }

  return (
    <div className="space-y-4">
      {confirmClear ? (
        <ClearConfirm
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            onClear();
            setConfirmClear(false);
            setClearedGuide(true);
            setImportNote(null);
          }}
        />
      ) : clearedGuide ? (
        <ClearedGuide onDone={() => setClearedGuide(false)} />
      ) : (
        <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl text-fg">Catch log</h2>
          <p className="text-sm text-muted">
            {rows.length} trips.{" "}
            {rows.length === 0 ? "Empty catch log." : sampleOnly ? "Sample catch log." : "Saved on this device."} Moon
            phase is calculated from the date.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
            >
              Back to map
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
          >
            {open ? "Close" : "Add a trip"}
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
          >
            Restore sample
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="h-11 rounded-lg bg-danger px-3 text-sm font-semibold text-danger-fg"
          >
            Clear log
          </button>
          <button
            type="button"
            onClick={() => zipInput.current?.click()}
            className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
          >
            Upload zip
          </button>
          <button
            type="button"
            onClick={() => void exportBackup(rows, waypoints).catch(() => setImportNote("The backup could not be saved."))}
            className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
          >
            Download backup
          </button>
          <button
            type="button"
            onClick={() => backupInput.current?.click()}
            className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
          >
            Restore backup
          </button>
          <input
            ref={backupInput}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importBackup(file);
            }}
          />
          <input
            ref={zipInput}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
            className="hidden"
            onChange={(e) => {
              const list = e.target.files;
              e.target.value = "";
              if (list?.length) void importSample(list);
            }}
          />
        </div>
      </div>

      <LogFilterBar
        rows={rows}
        waypoints={waypoints}
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setOpenSpecies(next.species || null);
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void importSample(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed px-4 py-6 text-center text-sm",
          dragOver ? "border-accent text-fg" : "border-border text-muted",
        )}
      >
        Drop a zip of photos here to replace the sample catch log. Or use Upload zip.
      </div>

      {importNote ? <p className="text-sm text-muted">{importNote}</p> : null}

      {open ? <AddTrip onAdd={onAdd} onDone={() => setOpen(false)} /> : null}

      <div className="space-y-2">
        {groups.map((group) => {
          const key = group.name || "";
          const open = openSpecies === key;
          const fish = group.rows.reduce((sum, row) => sum + row.count, 0);
          return (
            <section key={key || "unconfirmed"} className="rounded-xl border border-border bg-surface">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenSpecies(open ? null : key)}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left"
              >
                <span className="font-medium text-fg">{group.name || "Unconfirmed"}</span>
                <span className="text-sm text-muted tabular-nums">
                  {fish} fish · {group.rows.length} trip{group.rows.length === 1 ? "" : "s"} {open ? "▴" : "▾"}
                </span>
              </button>
              {open ? (
                <ul className="space-y-2 border-t border-border p-2">
                  {group.rows.map((row) => {
          const spot = spotById(row.spotId);
          const moon = moonOn(row.date);
          return (
            <li
              key={row.id}
              id={`trip-${row.id}`}
              className={cn(
                "rounded-xl border bg-surface p-3",
                highlight === row.id ? "border-accent" : "border-border",
              )}
            >
              {highlight === row.id && onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-3 h-11 rounded-lg border border-border px-3 text-sm text-fg"
                >
                  Back to map
                </button>
              ) : null}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-fg tabular-nums">
                  {formatPrettyDate(row.date)}
                  {row.startTime ? ` · ${row.startTime}` : ""}
                </p>
                <p className="text-sm font-semibold text-accent tabular-nums">
                  {row.count} {row.species || "Unconfirmed"}
                  {row.lengthIn ? ` · ${row.lengthIn} in` : ""}
                  {row.weightLb ? ` · ${row.weightLb} lb` : ""}
                </p>
              </div>
              <p className="text-sm text-muted">
                {[spot ? `${spot.name} · ${spot.area}` : row.spotId || null, tidePhrase(row)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-sm text-fg">
                {row.bait || "No bait noted"}
                {row.waterTempF != null ? ` · ${row.waterTempF}°F water` : ""}
                {row.windDir ? ` · ${row.windDir} ${row.windMph ?? ""} mph` : ""} · {moon.name}
              </p>
              {row.notes ? <p className="mt-1 text-sm text-muted">{row.notes}</p> : null}
              {row.lat != null && row.lng != null ? (
                <p className="mt-1 text-xs text-muted tabular-nums">
                  Photo GPS {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
                </p>
              ) : null}
              {row.photoFilename ? (
                <p className="mt-1 text-xs text-muted tabular-nums">{row.photoFilename}</p>
              ) : null}
              {row.photoFilename && row.source === "you" ? (
                <a
                  href={noaaPhotoLink(row.date)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm text-accent underline"
                >
                  NOAA 8665530 for this photo
                </a>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-4">
                <button
                  type="button"
                  className="text-sm text-accent underline"
                  onClick={() => setOpenId((current) => (current === row.id ? null : row.id))}
                >
                  {openId === row.id ? "Hide photo and data" : "Photo and data"}
                </button>
                <button
                  type="button"
                  className="text-sm text-accent underline"
                  onClick={() => {
                    const preview = logRowPreview(row);
                    void navigator.clipboard?.writeText(preview).then(
                      () => setCopied(row.id),
                      () => setCopied(null),
                    );
                  }}
                >
                  {copied === row.id ? "Copied the row" : "Copy log row"}
                </button>
              </div>
              {openId === row.id ? (
                <TripRecord
                  row={row}
                  onBack={() => {
                    setOpenId(null);
                    onBack?.();
                  }}
                />
              ) : null}
            </li>
                  );
                })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">No trips match that filter.</p>
      ) : null}
        </>
      )}
    </div>
  );
}

function ClearConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-3xl text-fg">Clear the catch log?</h2>
      <p className="text-sm text-muted">
        This removes every trip and photo saved on this phone. It cannot be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="h-11 rounded-lg bg-danger px-4 text-sm font-semibold text-danger-fg"
        >
          Clear the log
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

function ClearedGuide({ onDone }: { onDone: () => void }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-3xl text-fg">Log cleared</h2>
      <p className="text-sm text-fg">
        The old trips are gone. Upload the original photos of those catches to start a new book. Each
        confirmed photo becomes a trip, and the advice starts using it.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>Use the photos from the camera roll. A text, a social post, a screenshot, or an edited copy usually has no location and no time taken.</li>
        <li>
          Turn location on before you rely on older pictures. iPhone: Settings, Privacy & Security, Location
          Services, Camera, set to While Using the App, and turn Precise Location on. Settings, Camera, Formats:
          Most Compatible. Android: turn the phone Location on, and turn location tags on in the camera.
        </li>
        <li>Go to Home and tap Upload Your Fish Photo. Pick one original photo.</li>
        <li>Confirm the bait, the species, the length, and the map pin. Then tap Confirm My Catch.</li>
        <li>Repeat for each older photo. The new catch log is those confirmed trips.</li>
      </ol>
      <button
        type="button"
        onClick={onDone}
        className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
      >
        Back to catch log
      </button>
    </section>
  );
}

function TripRecord({ row, onBack }: { row: CatchRow; onBack: () => void }) {
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const spot = spotById(row.spotId);

  useEffect(() => {
    let dead = false;
    void loadPhoto(row.id)
      .then((url) => {
        if (!dead) setPhoto(url);
      })
      .catch(() => {
        if (!dead) setPhoto(null);
      });
    return () => {
      dead = true;
    };
  }, [row.id]);

  const facts = [
    ["Date", formatPrettyDate(row.date)],
    ["Start", row.startTime || "—"],
    ["End", row.endTime || "—"],
    ["Species", row.species ? `${row.count} ${row.species}` : "Unconfirmed"],
    ["Length", row.lengthIn == null ? "—" : `${row.lengthIn} in`],
    ["Weight", row.weightLb == null ? "—" : `${row.weightLb} lb`],
    ["Bait", row.bait || "—"],
    ["Tide", tidePhrase(row)],
    ["Spot", spot ? `${spot.name}, ${spot.area}` : row.spotId || "—"],
    ["Water", row.waterTempF == null ? "—" : `${row.waterTempF}°F`],
    ["Air", row.airTempF == null ? "—" : `${row.airTempF}°F`],
    ["Wind", row.windDir ? `${row.windDir} ${row.windMph ?? ""} mph`.trim() : "—"],
    ...(row.meteo
      ? meteoLines(row.meteo).filter(
          ([label]) =>
            !["Water temperature", "Tide stage", "Wind direction", "Wind speed", "Air temperature"].includes(label),
        )
      : []),
    [
      "Photo GPS",
      row.lat != null && row.lng != null ? `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}` : "—",
    ],
    ["File", row.photoFilename || "—"],
    ["Notes", row.notes || "—"],
  ];
  if (row.source === "you" && row.photoFilename) {
    facts.splice(facts.length - 1, 0, ["Station", "NOAA 8665530"]);
  }

  return (
    <div className="mt-3 rounded-lg bg-bg p-3">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
      >
        Back to map
      </button>
      {photo ? (
        <img
          src={photo}
          alt={`${row.species} logged ${formatPrettyDate(row.date)}`}
          className="mb-3 aspect-video w-full rounded-lg object-cover"
        />
      ) : (
        <p className="mb-3 text-sm text-muted">
          {photo === undefined ? "Loading the photo…" : "No photo was saved with this trip."}
        </p>
      )}
      <dl className="grid gap-2 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-sm text-fg">
              {label === "Station" ? (
                <a href={noaaPhotoLink(row.date)} target="_blank" rel="noreferrer" className="text-accent underline">
                  NOAA 8665530
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AddTrip({ onAdd, onDone }: { onAdd: (row: CatchRow) => void; onDone: () => void }) {
  const [date, setDate] = useState(todayInCharleston());
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("");
  const [tide, setTide] = useState<TideStage>("outgoing");
  const [tideHours, setTideHours] = useState<number | null>(null);
  const [tideTurn, setTideTurn] = useState<"high" | "low" | "">("");
  const [water, setWater] = useState("");
  const [air, setAir] = useState("");
  const [windDir, setWindDir] = useState<WindDir | "">("NE");
  const [wind, setWind] = useState("");
  const [bait, setBait] = useState("");
  const [species, setSpecies] = useState<Species>("Red Drum");
  const [count, setCount] = useState("0");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!date || !start) return;
    let dead = false;
    void liveConditions(date)
      .then((result) => {
        if (dead || !result.ok) return;
        const minutes = clockToMinutes(start);
        if (minutes == null) return;
        const turn = hoursAfterTurn(result.tides, minutes);
        setTideHours(turn?.hours ?? null);
        setTideTurn(turn?.turn ?? "");
      })
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [date, start]);

  return (
    <form
      className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({
          id: `u-${Date.now()}`,
          date,
          startTime: start,
          endTime: end,
          spotId: "",
          tideStage: tide,
          tideHours,
          tideTurn,
          waterTempF: water ? Number(water) : null,
          airTempF: air ? Number(air) : null,
          windDir,
          windMph: wind ? Number(wind) : null,
          bait,
          species,
          count: Math.max(0, Number(count) || 0),
          lengthIn: length ? Number(length) : null,
          weightLb: weight ? Number(weight) : null,
          photoFilename: "",
          notes,
          source: "you",
        });
        onDone();
      }}
    >
      <Label text="Date">
        <input required type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
      </Label>
      <Label text="Start">
        <input required type="time" className={field} value={start} onChange={(e) => setStart(e.target.value)} />
      </Label>
      <Label text="End">
        <input type="time" className={field} value={end} onChange={(e) => setEnd(e.target.value)} />
      </Label>
      <Label text="Tide">
        <select className={field} value={tide} onChange={(e) => setTide(e.target.value as TideStage)}>
          {TIDE_STAGES.map((stage) => (
            <option key={stage}>{stage}</option>
          ))}
        </select>
      </Label>
      <Label text="Species">
        <select className={field} value={species} onChange={(e) => setSpecies(e.target.value as Species)}>
          {SPECIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Label>
      <Label text="Count">
        <input className={field} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
      </Label>
      <Label text="Largest, in">
        <input className={field} inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} />
      </Label>
      <Label text="Weight, lb">
        <input className={field} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </Label>
      <Label text="Water °F">
        <input className={field} inputMode="decimal" value={water} onChange={(e) => setWater(e.target.value)} />
      </Label>
      <Label text="Air °F">
        <input className={field} inputMode="decimal" value={air} onChange={(e) => setAir(e.target.value)} />
      </Label>
      <Label text="Wind dir">
        <select className={field} value={windDir} onChange={(e) => setWindDir(e.target.value as WindDir)}>
          {WIND_DIRS.map((dir) => (
            <option key={dir}>{dir}</option>
          ))}
        </select>
      </Label>
      <Label text="Wind mph">
        <input className={field} inputMode="decimal" value={wind} onChange={(e) => setWind(e.target.value)} />
      </Label>
      <Label text="Bait or lure">
        <BaitPicker value={bait} onChange={setBait} />
      </Label>
      <Label text="Notes">
        <input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Label>
      <div className="sm:col-span-2">
        <button type="submit" className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg">
          Save trip
        </button>
      </div>
    </form>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-muted">
      {text}
      <div className="mt-1">{children}</div>
    </label>
  );
}
