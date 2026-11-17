import exifr from "exifr";

export type PhotoMeta = {
  lat: number | null;
  lng: number | null;
  taken: Date | null;
};

/** Read GPS and capture time from the original file. Resized previews do not keep this. */
export async function readPhotoMeta(file: Blob): Promise<PhotoMeta> {
  try {
    const [gps, tags] = await Promise.all([
      exifr.gps(file).catch(() => undefined),
      exifr
        .parse(file, {
          gps: false,
          xmp: false,
          iptc: false,
          icc: false,
          interop: false,
          ifd1: false,
          makerNote: false,
          pick: ["DateTimeOriginal", "CreateDate", "DateTimeDigitized"],
        })
        .catch(() => undefined),
    ]);
    const lat = finiteCoord(gps?.latitude, 90);
    const lng = finiteCoord(gps?.longitude, 180);
    const record = tags && typeof tags === "object" ? (tags as Record<string, unknown>) : {};
    const taken =
      asDate(record.DateTimeOriginal) ?? asDate(record.CreateDate) ?? asDate(record.DateTimeDigitized);
    return { lat, lng, taken };
  } catch {
    return { lat: null, lng: null, taken: null };
  }
}

export function captureStamp(taken: Date): { date: string; time: string } {
  const date = [
    taken.getFullYear(),
    String(taken.getMonth() + 1).padStart(2, "0"),
    String(taken.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [String(taken.getHours()).padStart(2, "0"), String(taken.getMinutes()).padStart(2, "0")].join(
    ":",
  );
  return { date, time };
}

function finiteCoord(value: unknown, limit: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}
