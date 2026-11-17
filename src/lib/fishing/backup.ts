import { strToU8, unzipSync, zipSync } from "fflate";
import { allPhotos, clearPhotos, savePhoto } from "@/lib/fishing/photos";
import type { CatchRow } from "@/lib/fishing/types";
import { parseWaypoints, type Waypoint } from "@/lib/fishing/waypoints";

export type Backup = {
  trips: CatchRow[];
  waypoints: Waypoint[];
  photos: Array<{ id: string; dataUrl: string }>;
};

function isTrip(value: unknown): value is CatchRow {
  if (!value || typeof value !== "object") return false;
  const row = value as CatchRow;
  return typeof row.id === "string" && typeof row.date === "string" && typeof row.spotId === "string";
}

export async function exportBackup(trips: CatchRow[], waypoints: Waypoint[]): Promise<void> {
  const photos = await allPhotos();
  const files: Record<string, Uint8Array> = {
    "log.json": strToU8(JSON.stringify({ version: 1, trips, waypoints })),
  };
  for (const photo of photos) {
    const bytes = dataUrlBytes(photo.dataUrl);
    if (bytes) files[`photos/${photo.id}${extension(photo.dataUrl)}`] = bytes;
  }
  const zipped = zipSync(files);
  const blob = new Blob([Uint8Array.from(zipped)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fishbiteiq-backup.zip";
  link.click();
  URL.revokeObjectURL(url);
}

export async function readBackup(file: File): Promise<Backup> {
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const logFile = entries["log.json"];
  if (!logFile) throw new Error("That zip is not a FishBiteIQ backup.");
  const parsed = JSON.parse(new TextDecoder().decode(logFile)) as { trips?: unknown; waypoints?: unknown };
  if (!Array.isArray(parsed.trips) || !parsed.trips.every(isTrip)) {
    throw new Error("The backup log could not be read.");
  }
  const photos: Backup["photos"] = [];
  for (const [path, bytes] of Object.entries(entries)) {
    if (!path.startsWith("photos/")) continue;
    const name = path.slice("photos/".length);
    const id = name.replace(/\.(jpe?g|png|webp)$/i, "");
    photos.push({ id, dataUrl: `data:${mime(name)};base64,${bytesToBase64(bytes)}` });
  }
  return { trips: parsed.trips, waypoints: parseWaypoints(parsed.waypoints), photos };
}

export async function installBackup(backup: Backup): Promise<void> {
  await clearPhotos().catch(() => undefined);
  for (const photo of backup.photos) {
    await savePhoto(photo.id, photo.dataUrl).catch(() => undefined);
  }
}

function extension(dataUrl: string): string {
  if (dataUrl.startsWith("data:image/png")) return ".png";
  if (dataUrl.startsWith("data:image/webp")) return ".webp";
  return ".jpg";
}

function mime(name: string): string {
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  return "image/jpeg";
}

function dataUrlBytes(dataUrl: string): Uint8Array | null {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
