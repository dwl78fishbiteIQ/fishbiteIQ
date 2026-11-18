import type { Map as LeafletMap } from "leaflet";
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
  const apply = () => {
    map.getContainer().dataset.labelZoom = labelZoom(map.getZoom());
  };
  map.on("zoom zoomend", apply);
  apply();
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
