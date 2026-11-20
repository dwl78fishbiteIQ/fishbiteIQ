const KEY = "lfa-custom-baits-v1";

export type BaitGroup = "live" | "frozen" | "artificial";

export const BAIT_GROUPS: { id: BaitGroup; label: string }[] = [
  { id: "live", label: "Live Bait" },
  { id: "frozen", label: "Frozen Bait" },
  { id: "artificial", label: "Artificial" },
];

const GROUPED: { name: string; category: BaitGroup }[] = [
  { name: "Live shrimp", category: "live" },
  { name: "Finger mullet", category: "live" },
  { name: "Mud minnow", category: "live" },
  { name: "Fiddler crab", category: "live" },
  { name: "Gulp shrimp", category: "artificial" },
  { name: "Grub", category: "artificial" },
  { name: "Paddle tail", category: "artificial" },
  { name: "Gold spoon", category: "artificial" },
  { name: "Popping cork", category: "artificial" },
  { name: "Carolina rig", category: "artificial" },
];

export const BAITS = GROUPED.map((bait) => bait.name);

type SavedBait = { name: string; category: BaitGroup | "" };

export function baitGroup(name: string): BaitGroup | null {
  if (/^grub\b/i.test(name.trim())) return "artificial";
  const known = GROUPED.find((bait) => bait.name.toLowerCase() === name.trim().toLowerCase());
  if (known) return known.category;
  const saved = loadSaved().find((bait) => bait.name.toLowerCase() === name.trim().toLowerCase());
  return saved?.category || null;
}

export function baitsIn(category: BaitGroup): string[] {
  const names = GROUPED.filter((bait) => bait.category === category).map((bait) => bait.name);
  for (const bait of loadSaved()) {
    const group = bait.category || (category === "live" ? "live" : "");
    if (group !== category) continue;
    if (names.some((item) => item.toLowerCase() === bait.name.toLowerCase())) continue;
    names.push(bait.name);
  }
  return names;
}

export const GRUB_COLORS = [
  "Chartreuse",
  "Pearl",
  "White",
  "New penny",
  "Motor oil",
  "Opening night",
  "Pink",
  "Pumpkin",
];

const LOG_KEY = "lfa-catch-log-v1";

export function grubColor(bait: string): string {
  const match = bait.trim().match(/^grub,\s*(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export function grubBait(color: string): string {
  const trimmed = color.trim();
  return trimmed ? `Grub, ${trimmed}` : "";
}

/** Colors already confirmed on a catch, plus the starting list. */
export function grubColors(): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  const add = (color: string) => {
    const trimmed = color.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) return;
    seen.add(key);
    colors.push(trimmed);
  };
  for (const color of GRUB_COLORS) add(color);
  try {
    const parsed = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return colors;
    for (const row of parsed) {
      if (!row || typeof row !== "object" || !("bait" in row)) continue;
      const bait = (row as { bait?: unknown }).bait;
      if (typeof bait !== "string") continue;
      add(grubColor(bait));
    }
  } catch {
    /* the starting colors still show */
  }
  return colors;
}

export function loadCustomBaits(): string[] {
  return loadSaved().map((bait) => bait.name);
}

function loadSaved(): SavedBait[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    const saved: SavedBait[] = [];
    for (const item of parsed) {
      if (typeof item === "string" && item.trim()) saved.push({ name: item.trim(), category: "" });
      if (!item || typeof item !== "object" || !("name" in item)) continue;
      const name = (item as { name?: unknown }).name;
      const category = (item as { category?: unknown }).category;
      if (typeof name !== "string" || !name.trim()) continue;
      saved.push({
        name: name.trim(),
        category: category === "live" || category === "frozen" || category === "artificial" ? category : "",
      });
    }
    return saved;
  } catch {
    return [];
  }
}

export function baitChoices(): string[] {
  const extra = loadCustomBaits().filter(
    (item) => !BAITS.some((bait) => bait.toLowerCase() === item.toLowerCase()),
  );
  return [...BAITS, ...extra];
}

/** Saves a new bait under the open group. A match already on the list is not duplicated. */
export function rememberBait(name: string, category: BaitGroup): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const known = baitChoices().find((bait) => bait.toLowerCase() === trimmed.toLowerCase());
  if (known) return known;
  const next = [...loadSaved(), { name: trimmed, category }];
  localStorage.setItem(KEY, JSON.stringify(next));
  return trimmed;
}
