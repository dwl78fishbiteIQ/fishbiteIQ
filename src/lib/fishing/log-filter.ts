import { milesBetween, spotById } from "@/lib/fishing/spots";
import type { CatchRow, Species, TideStage } from "@/lib/fishing/types";
import { nearestWaypoint, type Waypoint } from "@/lib/fishing/waypoints";

export type LogFilter = {
  species: Species | "";
  tide: TideStage | "";
  bait: string;
  place: string;
  from: string;
  to: string;
  minLength: string;
};

export const EMPTY_FILTER: LogFilter = {
  species: "",
  tide: "",
  bait: "",
  place: "",
  from: "",
  to: "",
  minLength: "",
};

export function placeLabel(row: CatchRow, waypoints: Waypoint[]): string {
  if (row.lat != null && row.lng != null) {
    const mark = nearestWaypoint(row.lat, row.lng, waypoints, 0.4);
    if (mark) return mark.name;
  }
  const spot = spotById(row.spotId);
  if (spot) return spot.name;
  if (row.lat != null && row.lng != null) return `${row.lat.toFixed(2)}, ${row.lng.toFixed(2)}`;
  return "No place";
}

export function filterRows(rows: CatchRow[], filter: LogFilter, waypoints: Waypoint[]): CatchRow[] {
  const minLength = filter.minLength.trim() === "" ? null : Number(filter.minLength);
  return rows.filter((row) => {
    if (filter.species && row.species !== filter.species) return false;
    if (filter.tide && row.tideStage !== filter.tide) return false;
    if (filter.bait && row.bait !== filter.bait) return false;
    if (filter.place && placeLabel(row, waypoints) !== filter.place) return false;
    if (filter.from && row.date < filter.from) return false;
    if (filter.to && row.date > filter.to) return false;
    if (minLength != null && Number.isFinite(minLength) && (row.lengthIn == null || row.lengthIn < minLength)) return false;
    return true;
  });
}

export function baitOptions(rows: CatchRow[]): string[] {
  return [...new Set(rows.map((row) => row.bait.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function placeOptions(rows: CatchRow[], waypoints: Waypoint[]): string[] {
  return [...new Set(rows.map((row) => placeLabel(row, waypoints)))].sort((a, b) => a.localeCompare(b));
}

export function rowNear(row: CatchRow, lat: number, lng: number, miles: number): boolean {
  return row.lat != null && row.lng != null && milesBetween(row.lat, row.lng, lat, lng) <= miles;
}
