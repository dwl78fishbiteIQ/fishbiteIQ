import type { Map as LeafletMap, Marker } from "leaflet";
import { PUBLIC_MARKS } from "@/lib/fishing/public-structure";
import { SPOTS } from "@/lib/fishing/spots";
import { publicLandings } from "@/lib/fishing/waters";
import { storedWaypoints } from "@/lib/fishing/waypoints";

const LANDING_ICON = `<svg class="landing-icon" viewBox="0 0 20 16" width="16" height="13" aria-hidden="true"><path fill="#4da3e0" stroke="#082033" stroke-width="1" d="M2 9.5 4.2 13h11.6L18 9.5c-2.2 1.2-5 1.6-8 1.6s-5.8-.4-8-1.6Z"/><path fill="#d7f1ff" stroke="#082033" stroke-width="1" d="M8 9V4.5h4.2L14 9"/><path stroke="#082033" stroke-width="1" d="M10 4.5V2"/></svg>`;

const PUBLIC_ICON = `<svg class="spot-icon" viewBox="0 0 16 20" width="14" height="18" aria-hidden="true"><path fill="#e08a3c" stroke="#1a1208" stroke-width="1.2" d="M8 1.2a5.2 5.2 0 0 0-5.2 5.2c0 3.9 5.2 11.2 5.2 11.2s5.2-7.3 5.2-11.2A5.2 5.2 0 0 0 8 1.2Z"/><circle cx="8" cy="6.4" r="1.7" fill="#1a1208"/></svg>`;

const USER_ICON = `<svg class="spot-icon" viewBox="0 0 18 18" width="16" height="16" aria-hidden="true"><path fill="#f4e7c5" stroke="#1a1208" stroke-width="1.2" d="m9 1.4 2.1 4.4 4.8.6-3.5 3.3.9 4.8L9 12.2 4.7 14.5l.9-4.8L2.1 6.4l4.8-.6Z"/></svg>`;

type Leaflet = typeof import("leaflet");

/** Public boat landings, public spots, and saved user spots. */
export function addPlaceLabels(L: Leaflet, map: LeafletMap, options?: { users?: boolean }) {
  for (const landing of publicLandings()) {
    L.marker([landing.lat, landing.lng], {
      icon: L.divIcon({
        className: "leaflet-div-icon landing-label",
        html: `${LANDING_ICON}<span>${escapeHtml(landing.name)}</span>`,
        iconSize: [170, 20],
        iconAnchor: [8, 10],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map);
  }
  for (const mark of PUBLIC_MARKS) {
    const reef = mark.kind === "structure";
    L.marker([mark.lat, mark.lng], {
      icon: L.divIcon({
        className: reef ? "leaflet-div-icon structure-label" : "leaflet-div-icon flat-label",
        html: `<span class="mark-dot"></span><span>${escapeHtml(mark.name)}</span>`,
        iconSize: [170, 16],
        iconAnchor: [6, 8],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map);
  }
  for (const spot of SPOTS) {
    placeSpot(L, map, spot, "public");
  }
  if (options?.users !== false) {
    for (const spot of storedWaypoints()) placeSpot(L, map, spot, "user");
  }
  const apply = () => {
    const zoom = map.getZoom();
    if (zoom == null) return;
    const container = map.getContainer();
    container.dataset.labelZoom = labelZoom(zoom);
    container.dataset.landingScale = scaleMiles(map) < 1 ? "in" : "out";
  };
  map.on("zoom zoomend resize", apply);
  apply();
}

export function placeSpot(
  L: Leaflet,
  map: LeafletMap | { addLayer: (layer: Marker) => unknown },
  spot: { lat: number; lng: number; name: string },
  kind: "public" | "user",
) {
  const marker = L.marker([spot.lat, spot.lng], {
    icon: L.divIcon({
      className: `leaflet-div-icon spot-label is-${kind}`,
      html: `${kind === "public" ? PUBLIC_ICON : USER_ICON}<span>${escapeHtml(spot.name)}</span>`,
      iconSize: [180, 20],
      iconAnchor: [7, 16],
    }),
    interactive: false,
    keyboard: false,
  });
  marker.addTo(map as LeafletMap);
  return marker;
}

function scaleMiles(map: LeafletMap): number {
  if (map.getZoom() == null || map.getSize().x < 1) return Number.POSITIVE_INFINITY;
  try {
    const y = map.getSize().y / 2;
    const left = map.containerPointToLatLng([0, y]);
    const right = map.containerPointToLatLng([100, y]);
    return map.distance(left, right) / 1609.344;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function labelZoom(zoom: number): string {
  if (zoom < 11) return "far";
  if (zoom < 13) return "mid";
  if (zoom < 15) return "near";
  return "close";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;");
}
