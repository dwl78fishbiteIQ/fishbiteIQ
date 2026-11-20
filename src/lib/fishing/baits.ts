const KEY = "lfa-custom-baits-v1";

export const BAITS = [
  "Live shrimp",
  "Finger mullet",
  "Gulp shrimp",
  "Mud minnow",
  "Grub",
  "Paddle tail",
  "Gold spoon",
  "Popping cork",
  "Fiddler crab",
  "Carolina rig",
];

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
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
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

/** Saves a new bait and returns the spelling to use. A match already on the list is not duplicated. */
export function rememberBait(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const known = baitChoices().find((bait) => bait.toLowerCase() === trimmed.toLowerCase());
  if (known) return known;
  const next = [...loadCustomBaits(), trimmed];
  localStorage.setItem(KEY, JSON.stringify(next));
  return trimmed;
}
