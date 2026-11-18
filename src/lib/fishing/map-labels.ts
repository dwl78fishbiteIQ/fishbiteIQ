import type { Map as LeafletMap } from "leaflet";
import { publicLandings, waterwayLabels } from "@/lib/fishing/waters";

/** Creek and river names, plus public boat landings, drawn on top of the satellite photo. */
export function addPlaceLabels(L: typeof import("leaflet"), map: LeafletMap) {
  for (const water of waterwayLabels()) {
    L.marker([water.lat, water.lng], {
      icon: L.divIcon({
        className: "water-label",
        html: `<span>${escapeHtml(water.name)}</span>`,
        iconSize: [160, 20],
        iconAnchor: [80, 10],
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
        iconSize: [170, 20],
        iconAnchor: [7, 10],
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
  return value.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}
