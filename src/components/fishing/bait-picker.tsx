import { useMemo, useState } from "react";
import { baitChoices, grubBait, grubColor, grubColors, rememberBait } from "@/lib/fishing/baits";
import { cn } from "@/lib/cn";

const LOG_KEY = "lfa-catch-log-v1";

export function BaitPicker({ value, onChange }: { value: string; onChange: (bait: string) => void }) {
  const [choices, setChoices] = useState(baitChoices);
  const [custom, setCustom] = useState("");
  const [more, setMore] = useState(false);
  const [colors, setColors] = useState(grubColors);
  const [colorDraft, setColorDraft] = useState("");
  const ranked = useMemo(() => rankBaits(choices), [choices]);
  const top = ranked.slice(0, 5);
  const rest = ranked.slice(5);
  const shown = more ? ranked : value && rest.includes(value) && value !== "Grub" ? [...top, value] : top;
  const buttons = shown.includes("Grub") ? shown : ["Grub", ...shown];
  const grubOn = value.trim().toLowerCase() === "grub" || grubColor(value).length > 0;
  const selectedColor = grubColor(value);

  function choose(item: string) {
    if (item === "Grub") {
      onChange(selectedColor ? grubBait(selectedColor) : "Grub");
      return;
    }
    onChange(item);
  }

  function chooseColor(color: string) {
    const bait = grubBait(color);
    if (!bait) return;
    onChange(bait);
  }

  function addColor() {
    const bait = grubBait(colorDraft);
    if (!bait) return;
    const color = grubColor(bait);
    setColors((current) => (current.some((item) => item.toLowerCase() === color.toLowerCase()) ? current : [...current, color]));
    onChange(bait);
    setColorDraft("");
  }

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
        {buttons.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => choose(item)}
            className={cn(
              "h-11 rounded-lg border px-3 text-sm",
              value === item || (item === "Grub" && grubOn) ? "border-accent bg-surface text-accent" : "border-border text-fg",
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
      {grubOn ? (
        <div className="mt-2 space-y-2">
          <label className="block text-sm text-muted" htmlFor="grub-color">
            Grub color
            <select
              id="grub-color"
              value={selectedColor}
              onChange={(event) => chooseColor(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg"
            >
              <option value="">Select a color</option>
              {colors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <input
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 text-base text-fg md:text-sm"
              value={colorDraft}
              onChange={(event) => setColorDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addColor();
                }
              }}
              placeholder="Add a grub color"
              aria-label="Add a grub color"
            />
            <button
              type="button"
              onClick={addColor}
              className="h-11 rounded-lg border border-border px-3 text-sm text-fg"
            >
              Add color
            </button>
          </div>
        </div>
      ) : null}
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
