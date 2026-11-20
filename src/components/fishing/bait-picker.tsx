import { useState } from "react";
import { BAIT_GROUPS, baitGroup, baitsIn, grubBait, grubColor, grubColors, rememberBait, type BaitGroup } from "@/lib/fishing/baits";
import { cn } from "@/lib/cn";

export function BaitPicker({ value, onChange }: { value: string; onChange: (bait: string) => void }) {
  const [group, setGroup] = useState<BaitGroup | null>(baitGroup(value));
  const [lists, setLists] = useState(() => ({
    live: baitsIn("live"),
    frozen: baitsIn("frozen"),
    artificial: baitsIn("artificial"),
  }));
  const [custom, setCustom] = useState("");
  const [colors, setColors] = useState(grubColors);
  const [colorDraft, setColorDraft] = useState("");
  const grubOn = group === "artificial" && (value.trim().toLowerCase() === "grub" || grubColor(value).length > 0);
  const selectedColor = grubColor(value);
  const options = group ? lists[group] : [];

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
    if (!group) return;
    const saved = rememberBait(custom, group);
    if (!saved) return;
    setLists((current) => ({ ...current, [group]: baitsIn(group) }));
    onChange(saved);
    setCustom("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {BAIT_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setGroup(item.id)}
            className={cn(
              "h-11 rounded-lg border px-3 text-sm font-semibold",
              group === item.id ? "border-accent bg-surface text-accent" : "border-border text-fg",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {group ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {options.length ? (
            options.map((item) => (
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
            ))
          ) : (
            <p className="text-sm text-muted">Nothing in this group yet. Add one below.</p>
          )}
        </div>
      ) : null}
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
            <button type="button" onClick={addColor} className="h-11 rounded-lg border border-border px-3 text-sm text-fg">
              Add color
            </button>
          </div>
        </div>
      ) : null}
      {group ? (
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
          <button type="button" onClick={addCustom} className="h-11 rounded-lg border border-border px-3 text-sm text-fg">
            Add bait
          </button>
        </div>
      ) : null}
    </div>
  );
}