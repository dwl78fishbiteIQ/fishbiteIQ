import { unzipSync } from "fflate";
import { captureStamp, readPhotoMeta } from "@/lib/fishing/photo-meta";
import { todayInCharleston } from "@/lib/fishing/time";
import type { CatchRow, Species } from "@/lib/fishing/types";
import { readPhoto } from "@/lib/fishing/vision";

const IMAGE = /\.(jpe?g|png|webp|heic|heif)$/i;

export async function filesFromUpload(list: FileList | File[]): Promise<File[]> {
  const incoming = Array.from(list);
  const files: File[] = [];
  for (const file of incoming) {
    if (await looksLikeZip(file)) {
      const packed = new Uint8Array(await file.arrayBuffer());
      let entries: Record<string, Uint8Array>;
      try {
        entries = unzipSync(packed);
      } catch {
        throw new Error("That zip could not be opened. Use a normal .zip of the original photos.");
      }
      for (const [name, bytes] of Object.entries(entries)) {
        if (name.includes("__MACOSX") || name.endsWith("/") || name.split("/").pop()?.startsWith(".")) continue;
        if (!isImageName(name) && !isImageBytes(bytes)) continue;
        const copy = new Uint8Array(bytes.byteLength);
        copy.set(bytes);
        const base = name.split("/").pop() || `photo-${files.length + 1}.jpg`;
        files.push(new File([copy], base, { type: mimeFor(base) }));
      }
      continue;
    }
    if (file.type.startsWith("image/") || IMAGE.test(file.name)) files.push(file);
  }
  return files;
}

const SAMPLE_BAITS = ["Live shrimp", "Mud minnow", "Finger mullet"] as const;

export async function rowFromPhoto(file: File, index: number): Promise<CatchRow> {
  const meta = await readPhotoMeta(file);
  const stamp = meta.taken ? captureStamp(meta.taken) : null;
  const base = (file.name.split("/").pop() || "photo").replace(/\.[^.]+$/, "");
  return {
    id: `imp-${Date.now()}-${index}`,
    date: stamp?.date ?? todayInCharleston(),
    startTime: stamp?.time ?? "",
    endTime: "",
    spotId: "",
    tideStage: "outgoing",
    waterTempF: null,
    airTempF: null,
    windDir: "",
    windMph: null,
    bait: SAMPLE_BAITS[Math.floor(Math.random() * SAMPLE_BAITS.length)],
    species: "",
    count: 1,
    lengthIn: null,
    weightLb: null,
    photoFilename: base,
    notes: "",
    source: "sample",
    lat: meta.lat,
    lng: meta.lng,
  };
}

/** Species and length from the same photo read used on Upload Your Fish Photo. */
export async function speciesFromPhoto(
  imageDataUrl: string,
): Promise<{ species: Species | ""; lengthIn: number | null }> {
  try {
    const result = await readPhoto({ data: { imageDataUrl } });
    if (!result.ok || !result.species) return { species: "", lengthIn: null };
    const length = result.lengthHigh ?? result.lengthLow;
    return { species: result.species, lengthIn: length };
  } catch {
    return { species: "", lengthIn: null };
  }
}

export async function shrinkPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read the photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function looksLikeZip(file: File): Promise<boolean> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip") || file.type.includes("zip")) return true;
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b;
}

function isImageName(name: string): boolean {
  return IMAGE.test(name);
}

function isImageBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 16));
  return head.startsWith("RIFF") || head.includes("ftyp");
}

function mimeFor(name: string): string {
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  return "image/jpeg";
}
