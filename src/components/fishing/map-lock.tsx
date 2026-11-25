import { useEffect, useRef, useState, type ReactNode } from "react";
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
  onExplore,
  onClose,
  children,
}: {
  onExplore: () => void;
  onClose?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hold, setHold] = useState(0);
  const shell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const kick = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => window.clearTimeout(kick);
  }, [open]);

  function explore() {
    setHold(shell.current?.offsetHeight ?? 0);
    setOpen(true);
    onExplore();
  }

  function close() {
    setOpen(false);
    onClose?.();
  }

  return (
    <>
      {open ? <div style={{ height: hold }} /> : null}
      {open ? (
        <button type="button" aria-label="Close map" className="fixed inset-0 z-[2090] bg-black/60" onClick={close} />
      ) : null}
      <div ref={shell} className={open ? "map-explore-shell" : "relative"}>
        {open ? (
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-fg">Map</p>
            <button
              type="button"
              onClick={close}
              className="h-11 rounded-lg border border-border px-4 text-sm font-semibold text-fg"
            >
              Close
            </button>
          </div>
        ) : null}
        <div className={open ? "relative min-h-0 flex-1" : "relative"}>
          {children}
          {open ? null : (
            <div className="absolute inset-0 z-10 flex items-start justify-end p-2">
              <button
                type="button"
                onClick={explore}
                className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg shadow-[0_8px_20px_rgb(0_0_0/0.35)]"
              >
                Explore Map
              </button>
            </div>
          )}
          <MapLegend />
        </div>
      </div>
    </>
  );
}

function MapLegend() {
  return (
    <ul className="pointer-events-none absolute bottom-2 left-2 z-20 flex max-w-[calc(100%-1rem)] flex-wrap gap-x-3 gap-y-1 rounded-lg bg-black/75 px-2 py-1.5 text-[10px] font-semibold text-white">
      <li className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-full border-2 border-[#7a120c] bg-[#e10600]" />
        Catch Logs
      </li>
      <li className="flex items-center gap-1">
        <svg viewBox="0 0 16 20" width="12" height="15" aria-hidden="true">
          <path fill="#e08a3c" stroke="#1a1208" strokeWidth="1.2" d="M8 1.2a5.2 5.2 0 0 0-5.2 5.2c0 3.9 5.2 11.2 5.2 11.2s5.2-7.3 5.2-11.2A5.2 5.2 0 0 0 8 1.2Z" />
          <circle cx="8" cy="6.4" r="1.7" fill="#1a1208" />
        </svg>
        Public Spots
      </li>
      <li className="flex items-center gap-1">
        <svg viewBox="0 0 18 18" width="13" height="13" aria-hidden="true">
          <path fill="#ffe14a" stroke="#1a1208" strokeWidth="1.2" d="m9 1.4 2.1 4.4 4.8.6-3.5 3.3.9 4.8L9 12.2 4.7 14.5l.9-4.8L2.1 6.4l4.8-.6Z" />
        </svg>
        Your Spots
      </li>
      <li className="flex items-center gap-1">
        <svg viewBox="0 0 20 16" width="14" height="11" aria-hidden="true">
          <path fill="#4da3e0" stroke="#082033" strokeWidth="1" d="M2 9.5 4.2 13h11.6L18 9.5c-2.2 1.2-5 1.6-8 1.6s-5.8-.4-8-1.6Z" />
          <path fill="#d7f1ff" stroke="#082033" strokeWidth="1" d="M8 9V4.5h4.2L14 9" />
          <path stroke="#082033" strokeWidth="1" d="M10 4.5V2" />
        </svg>
        Public Landing
      </li>
      <li className="flex items-center gap-1">
        <span className="inline-flex size-4 items-center justify-center rounded-full border-2 border-white bg-[#f4e7c5] text-[9px] leading-none font-extrabold text-black">
          F
        </span>
        DNR Flat
      </li>
      <li className="flex items-center gap-1">
        <span className="inline-block size-2.5 border-2 border-white bg-[#e08a3c]" />
        DNR Reef
      </li>
    </ul>
  );
}
