const KEY = "lfa-custom-baits-v1";

export const BAITS = [
  "Live shrimp",
  "Finger mullet",
  "Gulp shrimp",
  "Mud minnow",
  "Paddle tail",
  "Gold spoon",
  "Popping cork",
  "Fiddler crab",
  "Carolina rig",
];

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
