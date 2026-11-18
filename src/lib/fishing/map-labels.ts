import type { Map as LeafletMap } from "leaflet";
import { publicLandings, waterwayLabels } from "@/lib/fishing/waters";

/** Creek and river names, plus public boat landings, drawn on top of the satellite photo. */
export function addPlaceLabels(L: typeof import("leaflet"), map: LeafletMap) {
  for (const water of waterwayLabels()) {
    L.marker([water.lat, water.lng], {
      icon: L.divIcon({
        className: "water-label",
        html: `<span>${escapeHtml(water.name)}</span>`,
        iconSize: [140, 16],
        iconAnchor: [70, 8],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map);
  }
  for (const landing of publicLandings()) {
    L.marker([landing.lat, landing.lng], {
      icon: L.divIcon({
        className: "landing-label",
        html: `<span class="landing-dot"></span><span>${escapeHtml(landing.name)}</span>`,
        iconSize: [150, 18],
        iconAnchor: [7, 9],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}
