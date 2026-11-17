import { useMemo, useState } from "react";
import { baitChoices, rememberBait } from "@/lib/fishing/baits";
import { cn } from "@/lib/cn";

const LOG_KEY = "lfa-catch-log-v1";

export function BaitPicker({ value, onChange }: { value: string; onChange: (bait: string) => void }) {
  const [choices, setChoices] = useState(baitChoices);
  const [custom, setCustom] = useState("");
  const [more, setMore] = useState(false);
  const ranked = useMemo(() => rankBaits(choices), [choices]);
  const top = ranked.slice(0, 5);
  const rest = ranked.slice(5);
  const shown = more ? ranked : value && rest.includes(value) ? [...top, value] : top;

  function addCustom() {
    const saved = rememberBait(custom);
    if (!saved) return;
    setChoices(baitChoices());
    onChange(saved);
    setCustom("");
    setMore(true);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {shown.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "h-11 rounded-lg border px-3 text-sm",
              value === item ? "border-accent bg-surface text-accent" : "border-border text-fg",
            )}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMore((open) => !open)}
          className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
        >
          {more ? "Less" : rest.length ? `More (${rest.length})` : "More"}
        </button>
      </div>
      {more ? (
        <div className="mt-2 flex gap-2">
          <input
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-base text-fg md:text-sm"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            placeholder="Other bait"
            aria-label="Custom bait"
          />
          <button
            type="button"
            onClick={addCustom}
            className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
          >
            Add bait
          </button>
        </div>
      ) : null}
    </div>
  );
}

function rankBaits(choices: string[]): string[] {
  const totals = baitCounts();
  return [...choices].sort((a, b) => {
    const diff = (totals.get(b.toLowerCase()) ?? 0) - (totals.get(a.toLowerCase()) ?? 0);
    if (diff) return diff;
    return choices.indexOf(a) - choices.indexOf(b);
  });
}

function baitCounts(): Map<string, number> {
  const totals = new Map<string, number>();
  try {
    const parsed = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return totals;
    for (const row of parsed) {
      if (!row || typeof row !== "object" || !("bait" in row)) continue;
      const bait = (row as { bait?: unknown }).bait;
      if (typeof bait !== "string" || !bait.trim()) continue;
      totals.set(bait.trim().toLowerCase(), (totals.get(bait.trim().toLowerCase()) ?? 0) + 1);
    }
  } catch {
    /* an empty book just keeps the default order */
  }
  return totals;
}
