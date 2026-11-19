import type { ReactNode } from "react";
import type { Map as LeafletMap } from "leaflet";

type TappableMap = LeafletMap & { tap?: { disable: () => void; enable: () => void } };

export function freezeMap(map: LeafletMap) {
  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
  map.scrollWheelZoom.disable();
  map.boxZoom.disable();
  map.keyboard.disable();
  (map as TappableMap).tap?.disable();
}

export function thawMap(map: LeafletMap) {
  map.dragging.enable();
  map.touchZoom.enable();
  map.doubleClickZoom.enable();
  map.scrollWheelZoom.enable();
  map.boxZoom.enable();
  map.keyboard.enable();
  (map as TappableMap).tap?.enable();
}

export function MapLock({
  locked,
  onExplore,
  children,
}: {
  locked: boolean;
  onExplore: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {locked ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <button
            type="button"
            onClick={onExplore}
            className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg shadow-[0_8px_20px_rgb(0_0_0/0.35)]"
          >
            Explore Map
          </button>
        </div>
      ) : null}
    </div>
  );
}
