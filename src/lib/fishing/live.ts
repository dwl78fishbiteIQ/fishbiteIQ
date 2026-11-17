import { getConditions, loadConditions } from "@/lib/fishing/conditions";
import { getPhotoWeather, loadPhotoWeather, type PhotoWeather } from "@/lib/fishing/photo-weather";
import { getPublicReports, loadPublicReports, type PublicPulse } from "@/lib/fishing/public-reports";
import type { ConditionsResult, PhotoResult } from "@/lib/fishing/types";
import { readPhoto } from "@/lib/fishing/vision";

const pages = import.meta.env.VITE_GITHUB_PAGES === "1";

/** Tide and weather. On GitHub Pages these run in the browser. */
export function liveConditions(date: string): Promise<ConditionsResult> {
  if (!pages) return getConditions({ data: { date } });
  return loadConditions(date).catch((err: unknown) => ({
    ok: false as const,
    date,
    message: err instanceof Error ? err.message : "The tide station didn't answer.",
  }));
}

export function livePhotoWeather(input: {
  lat: number;
  lng: number;
  date: string;
  time: string;
}): Promise<PhotoWeather | null> {
  if (!pages) return getPhotoWeather({ data: input });
  return loadPhotoWeather(input).catch(() => null);
}

export function livePublicReports(): Promise<PublicPulse | null> {
  if (!pages) return getPublicReports();
  return loadPublicReports();
}

export function liveReadPhoto(imageDataUrl: string): Promise<PhotoResult> {
  if (!pages) return readPhoto({ data: { imageDataUrl } });
  return Promise.resolve({
    ok: false,
    message: "Photo reading isn't available on this install. Mark the fish and the length yourself.",
  });
}
