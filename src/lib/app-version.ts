/** Newest entry is the version built into the app. Add a line here and in public/version.json when a version is published. */
export const APP_RELEASES = [
  { version: "1.0.0", published: "2026-11-18" },
  { version: "1.1.0", published: "2026-11-20" },
] as const;

export const APP_VERSION = APP_RELEASES[APP_RELEASES.length - 1].version;
export const APP_PUBLISHED = APP_RELEASES[APP_RELEASES.length - 1].published;

export function publishedLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
