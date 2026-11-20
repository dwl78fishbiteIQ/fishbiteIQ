import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AmpText } from "@/components/fishing/amp-text";
import { BaitPicker } from "@/components/fishing/bait-picker";
import { exportBackup, installBackup, readBackup } from "@/lib/fishing/backup";
import { moonOn } from "@/lib/fishing/moon";
import { meteoLines } from "@/lib/fishing/photo-weather";
import { filesFromUpload, shrinkPhoto } from "@/lib/fishing/import-log";
import { liveConditions, liveReadPhoto } from "@/lib/fishing/live";
import { captureStamp, readPhotoMeta } from "@/lib/fishing/photo-meta";
import { hoursAfterTurn, noaaPhotoLink, stageFromStation, tidePhrase } from "@/lib/fishing/station";
import { EMPTY_FILTER, filterRows, placeLabel, type LogFilter } from "@/lib/fishing/log-filter";
import { loadPhoto, savePhoto, deletePhoto } from "@/lib/fishing/photos";
import { spotById, spotsWithinFeet } from "@/lib/fishing/spots";
import { clockToMinutes, formatPrettyDate } from "@/lib/fishing/time";
import type { CatchRow, PhotoRead, Species, TideEvent } from "@/lib/fishing/types";
import { SPECIES } from "@/lib/fishing/types";
import type { Waypoint } from "@/lib/fishing/waypoints";
import { LogFilterBar } from "@/components/fishing/log-filters";
import { cn } from "@/lib/cn";

type RollItemStatus = "waiting" | "checking" | "logged" | "missing" | "not-fish" | "unreadable" | "slow" | "duplicate";

type RollItem = { name: string; status: RollItemStatus };

type RollStatus = {
  selected: number;
  total: number;
  done: number;
  items: RollItem[];
  summary: { uploaded: number; missing: number; notFish: number; unreadable: number; duplicates: number } | null;
  error: string | null;
  source: "roll" | "onedrive";
  startedAt: number;
  stage: string;
};

function photoName(file: File): string {
  return (file.name.split("/").pop() || "Photo").replace(/\.[^.]+$/, "");
}

async function readOne(preview: string) {
  try {
    return await liveReadPhoto(preview);
  } catch (error) {
    const text = error instanceof Error ? `${error.name} ${error.message}` : "";
    return /timeout|abort/i.test(text) ? ("slow" as const) : ("unreadable" as const);
  }
}

type RollHit = {
  index: number;
  file: File;
  preview: string;
  at: number;
  date: string;
  time: string;
  lat: number;
  lng: number;
  read: PhotoRead;
};

function takenMinutes(date: string, time: string): number | null {
  const [year, month, day] = date.split("-").map(Number);
  const clock = clockToMinutes(time);
  if (!year || !month || !day || clock == null) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 60000) + clock;
}

/** Higher means the species and the length are easier to trust. */
function clarityScore(read: PhotoRead): number {
  let score = read.species ? 50 : 0;
  score += read.confidence === "high" ? 30 : read.confidence === "medium" ? 16 : 0;
  const low = read.lengthLow;
  const high = read.lengthHigh;
  if (low != null || high != null) score += 20;
  if (read.lengthBasis && !/no reference/i.test(read.lengthBasis)) score += 20;
  if (low != null && high != null) score += Math.max(0, 12 - Math.abs(high - low));
  return score;
}

function keepClearest(hits: RollHit[]): RollHit[] {
  const sorted = [...hits].sort((a, b) => a.at - b.at);
  const groups: RollHit[][] = [];
  for (const hit of sorted) {
    const group = groups[groups.length - 1];
    if (group && hit.at - group[group.length - 1].at <= 10) group.push(hit);
    else groups.push([hit]);
  }
  return groups.map((group) =>
    group.reduce((best, hit) => (clarityScore(hit.read) > clarityScore(best.read) ? hit : best)),
  );
}

export function LogBook({
  rows,
  highlight,
  sampleOnly,
  onClear,
  onReplace,
  onReplaceWaypoints,
  waypoints,
  onSaveSpot,
  onBack,
}: {
  rows: CatchRow[];
  highlight: string | null;
  sampleOnly: boolean;
  onClear: () => void;
  onReplace: (rows: CatchRow[]) => void;
  onReplaceWaypoints: (waypoints: Waypoint[]) => void;
  waypoints: Waypoint[];
  onSaveSpot?: (name: string, lat: number, lng: number) => void;
  onBack?: () => void;
}) {
  const [filter, setFilter] = useState<LogFilter>(EMPTY_FILTER);
  const [openSpecies, setOpenSpecies] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedGuide, setClearedGuide] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [establishOpen, setEstablishOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [rollStatus, setRollStatus] = useState<RollStatus | null>(null);

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

  async function searchRoll(list: FileList | File[], source: "roll" | "onedrive" = "roll") {
    setScanning(true);
    setImportNote(null);
    const tidesByDate = new Map<string, TideEvent[] | null>();
    const incoming = Array.from(list);
    const selected = incoming.length;
    let items: RollItem[] = incoming.map((file) => ({ name: photoName(file), status: "waiting" }));
    const startedAt = Date.now();
    const show = (
      done: number,
      summary: RollStatus["summary"] = null,
      error: string | null = null,
      stage?: string,
    ) => {
      const total = items.length;
      const label =
        stage ??
        (summary
          ? "Finished"
          : total
            ? `Checking photo ${Math.min(done + 1, total)} of ${total}`
            : "Downloading photos from OneDrive");
      setRollStatus({
        selected,
        total,
        done,
        items: items.map((item) => ({ ...item })),
        summary,
        error,
        source,
        startedAt,
        stage: label,
      });
    };
    show(0, null, null, source === "onedrive" ? "Downloading photos from OneDrive" : "Opening photos");
    try {
      const files = await filesFromUpload(incoming);
      items = files.map((file) => ({ name: photoName(file), status: "waiting" }));
      if (!files.length) {
        show(0, null, "No photos were selected.");
        return;
      }
      show(0);
      const hits: RollHit[] = [];
      let skippedPlace = 0;
      let notFish = 0;
      let unreadable = 0;
      for (const [index, file] of files.entries()) {
        items[index] = { ...items[index], status: "checking" };
        show(index);
        const meta = await readPhotoMeta(file);
        const stamp = meta.taken ? captureStamp(meta.taken) : null;
        const at = stamp ? takenMinutes(stamp.date, stamp.time) : null;
        if (!stamp?.date || !stamp.time || at == null || meta.lat == null || meta.lng == null) {
          skippedPlace += 1;
          items[index] = { ...items[index], status: "missing" };
          show(index + 1);
          continue;
        }
        let preview = "";
        try {
          preview = await shrinkPhoto(file);
        } catch {
          unreadable += 1;
          items[index] = { ...items[index], status: "unreadable" };
          show(index + 1);
          continue;
        }
        const result = await readOne(preview);
        if (result === "slow" || result === "unreadable") {
          unreadable += 1;
          items[index] = { ...items[index], status: result };
          show(index + 1);
          continue;
        }
        if (!result.ok) {
          if (/isn't available/i.test(result.message)) {
            items[index] = { ...items[index], status: "unreadable" };
            show(index, null, result.message);
            return;
          }
          unreadable += 1;
          items[index] = { ...items[index], status: "unreadable" };
          show(index + 1);
          continue;
        }
        if (result.kind !== "catch") {
          notFish += 1;
          items[index] = { ...items[index], status: "not-fish" };
          show(index + 1);
          continue;
        }
        items[index] = { ...items[index], status: "logged" };
        show(index + 1);
        hits.push({
          index,
          file,
          preview,
          at,
          date: stamp.date,
          time: stamp.time,
          lat: meta.lat,
          lng: meta.lng,
          read: result,
        });
      }
      const keptHits = keepClearest(hits);
      const kept = new Set(keptHits.map((hit) => hit.index));
      let duplicates = 0;
      for (const hit of hits) {
        if (kept.has(hit.index)) continue;
        duplicates += 1;
        items[hit.index] = { ...items[hit.index], status: "duplicate" };
      }
      const found: CatchRow[] = [];
      for (const hit of keptHits) {
        const minutes = clockToMinutes(hit.time);
        if (!tidesByDate.has(hit.date)) {
          const conditions = await liveConditions(hit.date).catch(() => null);
          tidesByDate.set(hit.date, conditions && conditions.ok ? conditions.tides : null);
        }
        const tides = tidesByDate.get(hit.date) ?? null;
        const stage = tides && minutes != null ? stageFromStation(tides, minutes) : null;
        const turn = tides && minutes != null ? hoursAfterTurn(tides, minutes) : null;
        const length = hit.read.lengthHigh ?? hit.read.lengthLow;
        const row: CatchRow = {
          id: `roll-${Date.now()}-${hit.index}`,
          date: hit.date,
          startTime: hit.time,
          endTime: "",
          spotId: "",
          tideStage: stage ?? "outgoing",
          tideHours: turn?.hours ?? null,
          tideTurn: turn?.turn ?? "",
          waterTempF: null,
          airTempF: null,
          windDir: "",
          windMph: null,
          bait: "N/A",
          species: hit.read.species ?? "",
          count: 1,
          lengthIn: length != null && length > 0 ? length : null,
          weightLb: null,
          photoFilename: photoName(hit.file),
          notes: hit.read.setting,
          source: "you",
          lat: hit.lat,
          lng: hit.lng,
        };
        try {
          await savePhoto(row.id, hit.preview);
        } catch {
          /* the trip can still be saved without the stored photo */
        }
        found.push(row);
      }
      if (found.length) {
        const yours = sampleOnly ? [] : rows.filter((row) => row.source === "you");
        onReplace([...found, ...yours]);
      }
      show(files.length, {
        uploaded: found.length,
        missing: skippedPlace,
        notFish,
        unreadable,
        duplicates,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : "";
      const message = /timeout|abort/i.test(text)
        ? "One photo took too long, so that one was skipped. The rest keep going."
        : text || "Those photos could not be searched.";
      show(items.filter((item) => item.status !== "waiting" && item.status !== "checking").length, null, message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      {rollStatus ? <RollWindow status={rollStatus} onClose={() => setRollStatus(null)} /> : null}
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
        <ClearedGuide
          onDone={() => {
            setClearedGuide(false);
            setManageOpen(false);
          }}
        />
      ) : backupOpen ? (
        <BackupPage
          note={importNote}
          onDownload={() =>
            void exportBackup(rows, waypoints).catch(() => setImportNote("The backup could not be saved."))
          }
          onRestoreFile={(file) => void importBackup(file)}
          onBack={() => {
            setBackupOpen(false);
            setImportNote(null);
          }}
        />
      ) : establishOpen ? (
        <EstablishPage
          scanning={scanning}
          note={importNote}
          onFiles={(list, source) => void searchRoll(list, source)}
          onBack={() => {
            setEstablishOpen(false);
            setImportNote(null);
          }}
        />
      ) : manageOpen ? (
        <ManageData
          onClear={() => setConfirmClear(true)}
          onBackup={() => {
            setImportNote(null);
            setBackupOpen(true);
          }}
          onEstablish={() => {
            setImportNote(null);
            setEstablishOpen(true);
          }}
          onBack={() => {
            setManageOpen(false);
            setImportNote(null);
          }}
        />
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
            onClick={() => {
              setImportNote(null);
              setManageOpen(true);
            }}
            className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
          >
            Manage My Catch Log Data
          </button>
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

      {importNote ? <p className="text-sm text-muted">{importNote}</p> : null}

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
          const named = placeLabel(row, waypoints);
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
                {[named !== "No place" ? named : spot ? `${spot.name} · ${spot.area}` : row.spotId || null, tidePhrase(row)]
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
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  onClick={() => setOpenId((current) => (current === row.id ? null : row.id))}
                >
                  {openId === row.id ? "Hide photo and data" : "Photo and data"}
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-1 rounded-md border border-accent bg-surface px-3 text-sm text-accent"
                  onClick={() => {
                    setDeleteId(null);
                    setEditId((current) => (current === row.id ? null : row.id));
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  {editId === row.id ? "Close edit" : "Edit"}
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-1 rounded-md border border-danger bg-surface px-3 text-sm text-danger"
                  onClick={() => {
                    setEditId(null);
                    setDeleteId(row.id);
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete
                </button>
              </div>
              {deleteId === row.id ? (
                <div className="mt-3 rounded-lg border border-border bg-bg p-3">
                  <p className="text-sm text-fg">Delete this catch from the log?</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onReplace(rows.filter((item) => item.id !== row.id));
                        void deletePhoto(row.id).catch(() => undefined);
                        if (openId === row.id) setOpenId(null);
                        setDeleteId(null);
                      }}
                      className="h-11 rounded-lg bg-danger px-4 text-sm font-semibold text-danger-fg"
                    >
                      Delete catch
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(null)}
                      className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {editId === row.id ? (
                <CatchEditor
                  row={row}
                  onCancel={() => setEditId(null)}
                  onSave={(next) => {
                    const named = next.spotName?.trim() ?? "";
                    let saved = next;
                    if (named && next.lat != null && next.lng != null) {
                      const same = spotsWithinFeet(next.lat, next.lng, waypoints, 100).find(
                        (spot) => spot.name.toLowerCase() === named.toLowerCase(),
                      );
                      if (same) {
                        saved = { ...next, spotName: same.name, spotId: same.kind === "guide" ? same.id : next.spotId };
                      } else {
                        onSaveSpot?.(named, next.lat, next.lng);
                      }
                    }
                    onReplace(rows.map((item) => (item.id === saved.id ? saved : item)));
                    setEditId(null);
                  }}
                />
              ) : null}
              {openId === row.id ? (
                <TripRecord
                  row={row}
                  waypoints={waypoints}
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

function CatchEditor({
  row,
  onSave,
  onCancel,
}: {
  row: CatchRow;
  onSave: (row: CatchRow) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(row.date);
  const [time, setTime] = useState(row.startTime);
  const [species, setSpecies] = useState<Species | "">(row.species);
  const [length, setLength] = useState(row.lengthIn == null ? "" : String(row.lengthIn));
  const [bait, setBait] = useState(row.bait);
  const [count, setCount] = useState(String(row.count));
  const [spotName, setSpotName] = useState(row.spotName ?? "");
  const [notes, setNotes] = useState(row.notes);
  const field = "mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg md:text-sm";
  const lengthValue = Number(length);
  const countValue = Number(count);

  return (
    <form
      className="mt-3 space-y-3 rounded-lg border border-border bg-bg p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          ...row,
          date,
          startTime: time,
          species,
          lengthIn: Number.isFinite(lengthValue) && lengthValue > 0 ? lengthValue : null,
          bait: bait.trim(),
          count: Number.isFinite(countValue) && countValue > 0 ? Math.round(countValue) : 0,
          spotName: spotName.trim(),
          notes,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-muted">
          Date
          <input type="date" className={field} value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="text-sm text-muted">
          Time
          <input type="time" className={field} value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label className="text-sm text-muted">
          Species
          <select
            className={field}
            value={species}
            onChange={(event) => setSpecies(event.target.value as Species | "")}
          >
            <option value="">Unconfirmed</option>
            {SPECIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          Approximate length (in)
          <input className={field} inputMode="decimal" value={length} onChange={(event) => setLength(event.target.value)} />
        </label>
        <label className="text-sm text-muted">
          Count
          <input className={field} inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} />
        </label>
        <label className="text-sm text-muted">
          Spot name
          <input className={field} value={spotName} onChange={(event) => setSpotName(event.target.value)} />
          <span className="mt-1 block text-xs">
            A new name is added to the maps unless that same spot is already within 100 ft.
          </span>
        </label>
      </div>
      <div>
        <p className="text-sm text-muted">Bait</p>
        <div className="mt-1">
          <BaitPicker value={bait} onChange={setBait} />
        </div>
      </div>
      <label className="block text-sm text-muted">
        Notes
        <textarea
          className="mt-1 min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg md:text-sm"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white">
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ManageData({
  onClear,
  onBackup,
  onEstablish,
  onBack,
}: {
  onClear: () => void;
  onBackup: () => void;
  onEstablish: () => void;
  onBack: () => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-3xl text-fg">Manage My Catch Log Data</h2>
      <button
        type="button"
        onClick={onEstablish}
        className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
      >
        Establish My Initial Catch Log From Previous Photos
      </button>
      <p className="text-sm text-muted">Clear the book, or save and restore a copy.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClear}
          className="h-11 rounded-lg bg-danger px-4 text-sm font-semibold text-danger-fg"
        >
          Clear log
        </button>
        <button
          type="button"
          onClick={onBackup}
          className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
        >
          Backup/Restore My Log
        </button>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
      >
        Back to catch log
      </button>
    </section>
  );
}

const ROLL_STATUS: Record<RollItemStatus, string> = {
  waiting: "Waiting",
  checking: "Checking…",
  logged: "Logged",
  missing: "Missing time or location",
  "not-fish": "No fish in the photo",
  unreadable: "Could not be read",
  slow: "Took too long",
  duplicate: "Same fish as a clearer photo",
};

function RollWindow({ status, onClose }: { status: RollStatus; onClose: () => void }) {
  const running = status.summary == null && !status.error;
  const pct = status.total ? Math.round((status.done / status.total) * 100) : 0;
  const now = useTicker(running);
  const drive = status.source === "onedrive";
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <section className="flex max-h-[85dvh] w-full max-w-md flex-col gap-3 overflow-hidden rounded-xl border border-border bg-surface p-4">
        <h2 className="text-2xl text-fg">{drive ? "OneDrive upload" : "Camera roll upload"}</h2>
        <p className="text-sm text-fg">
          {status.selected} photo{status.selected === 1 ? "" : "s"} selected
          {status.total !== status.selected ? ` · ${status.total} can be checked` : ""}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-bg">
          <div className="h-full bg-accent" style={{ width: `${running ? Math.max(pct, 4) : pct}%` }} />
        </div>
        {drive ? (
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-fg">{status.stage}</p>
            <p className="text-muted">
              {status.done} of {status.total} checked · {pct}%
            </p>
            <p className="tabular-nums text-fg">
              {running ? timeLeft(status, now) : status.summary ? "Done" : "Stopped"}
            </p>
            <p className="tabular-nums text-muted">Elapsed {clock(now - status.startedAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {running ? `Checking photo ${Math.min(status.done + 1, status.total)} of ${status.total}` : `${status.done} of ${status.total} checked`}
          </p>
        )}
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {status.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-fg">{item.name}</span>
              <span className={item.status === "missing" ? "shrink-0 text-danger" : "shrink-0 text-muted"}>
                {ROLL_STATUS[item.status]}
              </span>
            </li>
          ))}
        </ul>
        {status.error ? <p className="text-sm text-danger">{status.error}</p> : null}
        {status.summary ? (
          <div className="space-y-1 text-sm text-fg">
            <p>{status.summary.uploaded} uploaded to the catch log.</p>
            <p className="text-danger">
              {status.summary.missing} failed because the time or location was missing.
            </p>
            {status.summary.notFish ? <p className="text-muted">{status.summary.notFish} did not show a fish.</p> : null}
            {status.summary.unreadable ? <p className="text-muted">{status.summary.unreadable} could not be read.</p> : null}
            {status.summary.duplicates ? (
              <p className="text-muted">{status.summary.duplicates} were the same fish as a clearer photo.</p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          disabled={running}
          onClick={onClose}
          className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
        >
          {running ? "Uploading…" : "Done"}
        </button>
      </section>
    </div>
  );
}

function useTicker(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return now;
}

function clock(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(sec / 60);
  return `${minutes}:${String(sec % 60).padStart(2, "0")}`;
}

function timeLeft(status: RollStatus, now: number): string {
  if (!status.total) return "Downloading…";
  if (status.done <= 0) return "Estimating time remaining…";
  const elapsed = Math.max(1, now - status.startedAt);
  const leftMs = (elapsed / status.done) * (status.total - status.done);
  if (leftMs < 5000) return "Almost done";
  const left = Math.round(leftMs / 1000);
  if (left < 60) return `About ${left} seconds left`;
  const minutes = Math.ceil(left / 60);
  return `About ${minutes} minute${minutes === 1 ? "" : "s"} left`;
}

function EstablishPage({
  scanning,
  note,
  onFiles,
  onBack,
}: {
  scanning: boolean;
  note: string | null;
  onFiles: (list: FileList | File[], source: "roll" | "onedrive") => void;
  onBack: () => void;
}) {
  const rollInput = useRef<HTMLInputElement>(null);
  const albumInput = useRef<HTMLInputElement>(null);
  const [albumOk, setAlbumOk] = useState(false);
  useEffect(() => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const probe = document.createElement("input");
    setAlbumOk(!ios && "webkitdirectory" in probe);
  }, []);
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-3xl text-fg">Establish My Initial Catch Log From Previous Photos</h2>
      <p className="text-sm text-muted">
        {albumOk
          ? "Choose an album and every photo in that folder is included. You do not pick them one by one. The app then keeps only the ones that show a fish and still have a time and a location."
          : "An iPhone will not hand over a whole Photos album. Tap Search camera roll, open the album, then tap Select All. The app keeps only the photos that show a fish and still have a time and a location."}{" "}
        Shots of the same fish within 10 minutes count as one catch, and the clearest one is kept.
      </p>
      <div className="flex flex-wrap gap-2">
        {albumOk ? (
          <button
            type="button"
            disabled={scanning}
            onClick={() => {
              const input = albumInput.current;
              if (!input) return;
              input.setAttribute("webkitdirectory", "");
              input.setAttribute("directory", "");
              input.click();
            }}
            className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
          >
            {scanning ? "Searching photos…" : "Choose an album"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={scanning}
          onClick={() => rollInput.current?.click()}
          className={
            albumOk
              ? "h-11 rounded-lg border border-border px-4 text-sm font-semibold text-fg disabled:opacity-50"
              : "h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
          }
        >
          {scanning ? "Searching photos…" : "Search camera roll"}
        </button>
        <label
          className={
            scanning
              ? "relative inline-flex h-11 cursor-not-allowed items-center rounded-lg border border-border px-4 text-sm font-semibold text-fg opacity-50"
              : "relative inline-flex h-11 cursor-pointer items-center rounded-lg border border-border px-4 text-sm font-semibold text-fg"
          }
        >
          {scanning ? "Searching photos…" : "Upload from OneDrive"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={scanning}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (picked.length) onFiles(picked, "onedrive");
            }}
          />
        </label>
      </div>
      <p className="text-sm text-muted">
        On an iPhone, tap Upload from OneDrive, then Browse, then OneDrive. On Android, tap it, then Files, then
        OneDrive. Pick the original photos. A shared link or a preview usually drops the time and the location.
      </p>
      <input
        ref={albumInput}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (picked.length) onFiles(picked, "roll");
        }}
      />
      <input
        ref={rollInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (picked.length) onFiles(picked, "roll");
        }}
      />
      {note ? <p className="text-sm text-fg">{note}</p> : null}
      <button
        type="button"
        onClick={onBack}
        className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
      >
        Back
      </button>
    </section>
  );
}

function BackupPage({
  note,
  onDownload,
  onRestoreFile,
  onBack,
}: {
  note: string | null;
  onDownload: () => void;
  onRestoreFile: (file: File) => void;
  onBack: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="text-3xl text-fg">Backup/Restore My Log</h2>
      <p className="text-sm text-muted">
        Download a copy of the trips, photos, and saved spots on this phone. Restore replaces the log on this
        phone with a copy you saved earlier.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
        >
          Download backup
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
        >
          Restore backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onRestoreFile(file);
          }}
        />
      </div>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
      <button
        type="button"
        onClick={onBack}
        className="h-11 rounded-lg border border-border px-4 text-sm text-fg"
      >
        Back
      </button>
    </section>
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
          <AmpText text="Turn location on before you rely on older pictures. iPhone: Settings, Privacy & Security, Location" />
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

function TripRecord({ row, waypoints, onBack }: { row: CatchRow; waypoints: Waypoint[]; onBack: () => void }) {
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const spot = spotById(row.spotId);
  const named = placeLabel(row, waypoints);

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
    ["Spot", named !== "No place" ? named : spot ? `${spot.name}, ${spot.area}` : row.spotId || "—"],
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
