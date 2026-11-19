import type { Map as LeafletMap } from "leaflet";
import { PUBLIC_MARKS } from "@/lib/fishing/public-structure";
import { publicLandings } from "@/lib/fishing/waters";

const LANDING_ICON = `<svg class="landing-icon" viewBox="0 0 20 16" width="16" height="13" aria-hidden="true"><path fill="#4da3e0" stroke="#082033" stroke-width="1" d="M2 9.5 4.2 13h11.6L18 9.5c-2.2 1.2-5 1.6-8 1.6s-5.8-.4-8-1.6Z"/><path fill="#d7f1ff" stroke="#082033" stroke-width="1" d="M8 9V4.5h4.2L14 9"/><path stroke="#082033" stroke-width="1" d="M10 4.5V2"/></svg>`;

/** Public boat landings drawn on top of the satellite photo. */
export function addPlaceLabels(L: typeof import("leaflet"), map: LeafletMap) {
  for (const landing of publicLandings()) {
    L.marker([landing.lat, landing.lng], {
      icon: L.divIcon({
        className: "landing-label",
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
        className: reef ? "structure-label" : "flat-label",
        html: `<span class="mark-dot"></span><span>${escapeHtml(mark.name)}</span>`,
        iconSize: [170, 16],
        iconAnchor: [6, 8],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map);
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
