import { useEffect, useState } from "react";
import { milesBetween, spotsWithinFeet } from "@/lib/fishing/spots";

export type Waypoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

const KEY = "lfa-waypoints-v1";
const EVENT = "lfa-waypoints";

function isWaypoint(value: unknown): value is Waypoint {
  if (!value || typeof value !== "object") return false;
  const mark = value as Waypoint;
  return typeof mark.id === "string" && typeof mark.name === "string" && Number.isFinite(mark.lat) && Number.isFinite(mark.lng);
}

export function parseWaypoints(value: unknown): Waypoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isWaypoint);
}

export function useWaypoints() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setWaypoints(parseWaypoints(JSON.parse(raw) as unknown));
    } catch {
      /* start with none */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(waypoints));
    window.dispatchEvent(new CustomEvent(EVENT));
  }, [waypoints, ready]);

  return {
    waypoints,
    save(name: string, lat: number, lng: number) {
      const trimmed = name.trim();
      if (!trimmed) return;
      setWaypoints((current) => {
        const near = current.find((mark) => milesBetween(mark.lat, mark.lng, lat, lng) <= 0.05);
        if (near) {
          return current.map((mark) => (mark.id === near.id ? { ...mark, name: trimmed, lat, lng } : mark));
        }
        const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `wp-${Date.now()}`;
        return [...current, { id, name: trimmed, lat, lng }];
      });
    },
    remove(id: string) {
      setWaypoints((current) => current.filter((mark) => mark.id !== id));
    },
    saveEdited(name: string, lat: number, lng: number) {
      const trimmed = name.trim();
      if (!trimmed) return;
      setWaypoints((current) => {
        const near = spotsWithinFeet(lat, lng, current, 100);
        if (near.some((spot) => spot.name.toLowerCase() === trimmed.toLowerCase())) return current;
        const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `wp-${Date.now()}`;
        return [...current, { id, name: trimmed, lat, lng }];
      });
    },
    replace(next: Waypoint[]) {
      setWaypoints(next);
    },
  };
}

export function storedWaypoints(): Waypoint[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return parseWaypoints(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function subscribeWaypoints(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function nearestWaypoint(lat: number, lng: number, waypoints: Waypoint[], withinMiles: number): Waypoint | null {
  let best: Waypoint | null = null;
  let miles = withinMiles;
  for (const mark of waypoints) {
    const distance = milesBetween(lat, lng, mark.lat, mark.lng);
    if (distance <= miles) {
      best = mark;
      miles = distance;
    }
  }
  return best;
}

export function mentionedWaypoint(text: string, waypoints: Waypoint[]): Waypoint | null {
  const lower = text.toLowerCase();
  const hits = waypoints.filter((mark) => {
    const name = mark.name.trim().toLowerCase();
    return name.length >= 3 && lower.includes(name);
  });
  hits.sort((a, b) => b.name.length - a.name.length);
  return hits[0] ?? null;
}
