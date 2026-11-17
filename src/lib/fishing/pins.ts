import { milesBetween, spotById } from "@/lib/fishing/spots";
import type { CatchRow } from "@/lib/fishing/types";

/** Catches this close share one pin. About 200 feet. */
const CLUSTER_MILES = 0.04;

export type CatchPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  area: string;
  rows: CatchRow[];
  fish: number;
  photoCount: number;
};

type Placed = { lat: number; lng: number; row: CatchRow; photo: boolean };

export function catchPins(rows: CatchRow[]): CatchPin[] {
  const placed = rows.map(placeRow).filter((p): p is Placed => p != null);
  const clusters: Placed[][] = [];
  for (const point of placed) {
    const cluster = clusters.find((group) =>
      group.some((other) => milesBetween(other.lat, other.lng, point.lat, point.lng) <= CLUSTER_MILES),
    );
    if (cluster) cluster.push(point);
    else clusters.push([point]);
  }
  return clusters
    .map(toPin)
    .sort((a, b) => b.fish - a.fish || b.rows.length - a.rows.length || a.title.localeCompare(b.title));
}

function placeRow(row: CatchRow): Placed | null {
  if (row.lat != null && row.lng != null && Number.isFinite(row.lat) && Number.isFinite(row.lng)) {
    return { lat: row.lat, lng: row.lng, row, photo: true };
  }
  const spot = spotById(row.spotId);
  if (!spot) return null;
  return { lat: spot.lat, lng: spot.lng, row, photo: false };
}

function toPin(group: Placed[]): CatchPin {
  const lat = group.reduce((sum, p) => sum + p.lat, 0) / group.length;
  const lng = group.reduce((sum, p) => sum + p.lng, 0) / group.length;
  const spotIds = [...new Set(group.map((p) => p.row.spotId))];
  const spot = spotIds.length === 1 ? spotById(spotIds[0] ?? "") : undefined;
  const rows = [...group.map((p) => p.row)].sort((a, b) =>
    a.date === b.date ? b.startTime.localeCompare(a.startTime) : b.date.localeCompare(a.date),
  );
  return {
    id: `${lat.toFixed(4)},${lng.toFixed(4)}`,
    lat,
    lng,
    title: spot?.name ?? "Photo pin",
    area: spot?.area ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    rows,
    fish: rows.reduce((sum, row) => sum + row.count, 0),
    photoCount: group.filter((p) => p.photo).length,
  };
}
