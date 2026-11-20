import { useEffect, useState } from "react";
import { readBackup } from "@/lib/fishing/backup";
import { clearPhotos, deletePhoto, savePhoto } from "@/lib/fishing/photos";
import { SEED } from "@/lib/fishing/seed";
import { SAMPLE_WAYPOINTS } from "@/lib/fishing/sample-waypoints";
import type { CatchRow } from "@/lib/fishing/types";

const KEY = "lfa-catch-log-v1";
const SAMPLE_KEY = "lfa-catch-sample-v1";
const SAMPLE_VERSION = "wayne-sample-3";
const SAMPLE_VERSION_KEY = "lfa-sample-version";
const WAYPOINT_KEY = "lfa-waypoints-v1";

function isRow(value: unknown): value is CatchRow {
  if (!value || typeof value !== "object") return false;
  const row = value as CatchRow;
  return typeof row.id === "string" && typeof row.date === "string" && typeof row.spotId === "string";
}

export function useCatchLog() {
  const [rows, setRows] = useState<CatchRow[]>(SEED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? parseRows(raw) : null;
      const seedIds = new Set(SEED.map((row) => row.id));
      const replaceSample = localStorage.getItem(SAMPLE_VERSION_KEY) !== SAMPLE_VERSION;
      const previous = parsed ?? [];
      for (const row of previous) {
        if (row.source === "sample" && !seedIds.has(row.id)) void deletePhoto(row.id).catch(() => undefined);
      }
      const userRows = previous.filter((row) => row.source !== "sample" && !seedIds.has(row.id));
      const storedSample = previous.filter((row) => row.source === "sample" && seedIds.has(row.id));
      const sample = replaceSample || storedSample.length !== SEED.length ? SEED : storedSample;
      setRows([...sample, ...userRows]);
      if (replaceSample) {
        localStorage.setItem(WAYPOINT_KEY, JSON.stringify(SAMPLE_WAYPOINTS));
        window.dispatchEvent(new CustomEvent("lfa-waypoints"));
      }
      localStorage.removeItem(SAMPLE_KEY);
      localStorage.setItem(SAMPLE_VERSION_KEY, SAMPLE_VERSION);
      void installSamplePhotos();
    } catch {
      /* keep the sample book */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(rows));
  }, [rows, ready]);

  return {
    rows,
    ready,
    sampleOnly: rows.every((r) => r.source === "sample"),
    add(row: CatchRow) {
      setRows((current) => [row, ...current]);
    },
    clear() {
      setRows([]);
      localStorage.removeItem(SAMPLE_KEY);
      void clearPhotos().catch(() => undefined);
    },
    replace(next: CatchRow[]) {
      setRows(next);
      if (next.every((row) => row.source === "sample")) {
        localStorage.setItem(SAMPLE_KEY, JSON.stringify(next));
      }
    },
    nameSpecies(id: string, species: CatchRow["species"], lengthIn: number | null) {
      setRows((current) => {
        const next = current.map((row) =>
          row.id === id ? { ...row, species, lengthIn: row.lengthIn ?? lengthIn } : row,
        );
        if (next.every((row) => row.source === "sample")) {
          localStorage.setItem(SAMPLE_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    restoreSample() {
      const custom = localStorage.getItem(SAMPLE_KEY);
      const parsed = custom ? parseRows(custom) : null;
      setRows(parsed && parsed.length ? parsed : SEED);
    },
  };
}

function parseRows(raw: string): CatchRow[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isRow)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function installSamplePhotos(): Promise<void> {
  const key = `${SAMPLE_VERSION_KEY}-photos`;
  if (localStorage.getItem(key) === SAMPLE_VERSION) return;
  try {
    const response = await fetch("/sample/wayne-sample-log.zip");
    if (!response.ok) return;
    const file = new File([await response.blob()], "wayne-sample-log.zip", { type: "application/zip" });
    const backup = await readBackup(file);
    for (const photo of backup.photos) await savePhoto(photo.id, photo.dataUrl);
    localStorage.setItem(key, SAMPLE_VERSION);
  } catch {
    /* the trips still show; photos can load on the next open */
  }
}
