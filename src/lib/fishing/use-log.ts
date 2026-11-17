import { useEffect, useState } from "react";
import { clearPhotos } from "@/lib/fishing/photos";
import { SEED } from "@/lib/fishing/seed";
import type { CatchRow } from "@/lib/fishing/types";

const KEY = "lfa-catch-log-v1";
const SAMPLE_KEY = "lfa-catch-sample-v1";

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
      if (raw) {
        const parsed = parseRows(raw);
        if (parsed) setRows(parsed);
      }
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
