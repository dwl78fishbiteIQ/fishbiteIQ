import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { catchPins, type CatchPin } from "@/lib/fishing/pins";
import { spotById } from "@/lib/fishing/spots";
import { formatPrettyDate } from "@/lib/fishing/time";
import type { CatchRow, Species } from "@/lib/fishing/types";
import { SPECIES } from "@/lib/fishing/types";
import { addPlaceLabels } from "@/lib/fishing/map-labels";
import { type Waypoint } from "@/lib/fishing/waypoints";
import { freezeMap, MapLock, thawMap } from "@/components/fishing/map-lock";
import { cn } from "@/lib/cn";

/** Bigger pin when more catches share that spot. One catch stays small. */
function catchIconRadius(count: number): number {
  return Math.min(28, Math.round(8 + 6 * Math.log2(Math.max(1, count))));
}

export function CatchMap({
  rows,
  compact = false,
  waypoints = [],
  onOpenTrip,
  onDeleteWaypoint,
}: {
  rows: CatchRow[];
  compact?: boolean;
  waypoints?: Waypoint[];
  onOpenTrip?: (id: string) => void;
  onDeleteWaypoint?: (id: string) => void;
}) {
  const [species, setSpecies] = useState<Species | "">("");
  const filtered = useMemo(
    () => rows.filter((row) => !species || row.species === species),
    [rows, species],
  );
  const pins = useMemo(() => catchPins(filtered), [filtered]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pins.find((pin) => pin.id === selectedId) ?? pins[0] ?? null;
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const fitted = useRef("");
  const [ready, setReady] = useState(false);
  const [heat, setHeat] = useState(false);
  const heatCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    let detachResize = () => {};
    void import("leaflet").then((mod) => {
      if (dead || mapRef.current) return;
      const L = mod.default ?? mod;
      const map = L.map(el, {
        zoomControl: true,
        attributionControl: true,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 19,
        },
      ).addTo(map);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 },
      ).addTo(map);
      map.setView([32.78, -79.88], 11);
      freezeMap(map);
      addPlaceLabels(L, map);
      mapRef.current = map;
      groupRef.current = L.layerGroup().addTo(map);
      const onResize = () => map.invalidateSize();
      window.addEventListener("resize", onResize);
      detachResize = () => window.removeEventListener("resize", onResize);
      setReady(true);
      requestAnimationFrame(() => map.invalidateSize());
    });
    return () => {
      dead = true;
      detachResize();
      mapRef.current?.remove();
      mapRef.current = null;
      groupRef.current = null;
      heatCanvas.current?.remove();
      heatCanvas.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = groupRef.current;
    if (!map || !group) return;
    let dead = false;
    void import("leaflet").then((mod) => {
      if (dead) return;
      const L = mod.default ?? mod;
      map.invalidateSize();
      group.clearLayers();
      const root = getComputedStyle(document.documentElement);
      const surface = root.getPropertyValue("--color-surface-2").trim();
      const catchRed = "#e10600";
      for (const pin of pins) {
        if (heat) break;
        const active = pin.id === selected?.id;
        const empty = pin.fish === 0;
        const count = Math.max(pin.fish, pin.rows.length, 1);
        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: catchIconRadius(count),
          color: active ? "#fff" : "#7a120c",
          weight: active ? 3 : 2,
          fillColor: empty ? surface : catchRed,
          fillOpacity: 0.92,
        });
        marker.bindTooltip(`${pin.rows.length}`, {
          permanent: true,
          direction: "center",
          className: empty ? "catch-pin-count is-empty" : "catch-pin-count",
        });
        marker.bindPopup(pinPopup(pin), { closeButton: true, className: "map-trip-popup" });
        marker.on("click", () => setSelectedId(pin.id));
        marker.on("popupopen", (event) => {
          event.popup.getElement()?.querySelectorAll<HTMLButtonElement>("[data-trip]").forEach((button) => {
            button.addEventListener("click", () => {
              const id = button.dataset.trip;
              if (id) onOpenTrip?.(id);
            });
          });
        });
        marker.addTo(group);
      }
      const catches = pins.map((pin) => [pin.lat, pin.lng] as [number, number]);
      const key = pins.map((pin) => pin.id).join("|");
      if (catches.length && fitted.current !== key) {
        fitted.current = key;
        requestAnimationFrame(() => {
          if (dead) return;
          map.invalidateSize();
          if (catches.length === 1) map.setView(catches[0], 13);
          else map.fitBounds(L.latLngBounds(catches), { padding: [36, 36], maxZoom: 13 });
        });
      }
      if (!catches.length && fitted.current !== "none") {
        fitted.current = "none";
        map.setView([32.78, -79.88], 11);
      }
    });
    return () => {
      dead = true;
    };
  }, [pins, selected?.id, ready, onOpenTrip, heat]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!heat) {
      heatCanvas.current?.remove();
      heatCanvas.current = null;
      return;
    }
    let dead = false;
    const canvas = document.createElement("canvas");
    canvas.className = "pointer-events-none";
    canvas.style.position = "absolute";
    map.getPanes().overlayPane.appendChild(canvas);
    heatCanvas.current = canvas;
    const points = heatPoints(filtered);
    const draw = () => {
      if (dead) return;
      void import("leaflet").then((mod) => {
        if (dead) return;
        paintHeat(mod.default ?? mod, map, canvas, points);
      });
    };
    map.on("move zoom resize viewreset", draw);
    draw();
    return () => {
      dead = true;
      map.off("move zoom resize viewreset", draw);
      canvas.remove();
      if (heatCanvas.current === canvas) heatCanvas.current = null;
    };
  }, [heat, filtered, ready]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl text-fg">My Catch Map</h2>
          <p className="text-sm text-muted">
            {filtered.length} trips across {pins.length} {pins.length === 1 ? "place" : "places"}. Photo
            GPS is used when a trip has it. Everything else sits on the guide spot.
            {heat ? " Brighter color means more fish logged there." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={heat}
            onClick={() => setHeat((on) => !on)}
            className={cn(
              "h-11 rounded-lg border px-3 text-sm font-semibold",
              heat ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg",
            )}
          >
            {heat ? "Heatmap on" : "Heatmap"}
          </button>
          <select
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
          value={species}
          onChange={(e) => {
            setSpecies(e.target.value as Species | "");
            setSelectedId(null);
          }}
          aria-label="Filter the map by species"
        >
          <option value="">All species</option>
          {SPECIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        </div>
      </div>

      {!compact && waypoints.length ? (
        <ul className="flex flex-wrap gap-2">
          {waypoints.map((mark) => (
            <li key={mark.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="text-fg">{mark.name}</span>
              <button type="button" className="text-muted underline" onClick={() => onDeleteWaypoint?.(mark.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {pins.length === 0 ? <p className="text-sm text-muted">Nothing to plot for that filter.</p> : null}

      <div className="rounded-xl border border-border">
        <MapLock
          onExplore={() => {
            const map = mapRef.current;
            if (map) thawMap(map);
          }}
          onClose={() => {
            const map = mapRef.current;
            if (map) freezeMap(map);
          }}
        >
          <div
            ref={host}
            className={compact ? "catch-map is-compact" : "catch-map"}
            role="application"
            aria-label="Map of catches"
          />
        </MapLock>
      </div>
    </div>
  );
}

function pinPopup(pin: CatchPin): string {
  const trips = pin.rows
    .map((row) => {
      const when = `${formatPrettyDate(row.date)}${row.startTime ? ` · ${row.startTime}` : ""}`;
      return `<button type="button" data-trip="${escapeHtml(row.id)}">${escapeHtml(when)} · ${row.count} ${escapeHtml(row.species)}</button>`;
    })
    .join("");
  return `<div class="map-trip-pop"><p>${escapeHtml(pin.title)}</p>${trips}</div>`;
}

function escapeHtml(value: string): string {
  const named: Record<string, string> = {
    "&": "\u0026amp;",
    "<": "\u0026lt;",
    ">": "\u0026gt;",
    '"': "\u0026quot;",
    "'": "\u0026#39;",
  };
  return value.replace(/[&<>"']/g, (char) => named[char] ?? char);
}

function heatPoints(rows: CatchRow[]): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  for (const row of rows) {
    const weight = Math.max(1, row.count || 0);
    if (row.lat != null && row.lng != null && Number.isFinite(row.lat) && Number.isFinite(row.lng)) {
      points.push([row.lat, row.lng, weight]);
      continue;
    }
    const spot = spotById(row.spotId);
    if (spot) points.push([spot.lat, spot.lng, weight]);
  }
  return points;
}

function paintHeat(
  L: typeof import("leaflet"),
  map: LeafletMap,
  canvas: HTMLCanvasElement,
  points: Array<[number, number, number]>,
) {
  const size = map.getSize();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(size.x * ratio));
  canvas.height = Math.max(1, Math.round(size.y * ratio));
  canvas.style.width = `${size.x}px`;
  canvas.style.height = `${size.y}px`;
  L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, size.x, size.y);
  if (!points.length) return;
  const max = Math.max(...points.map((point) => point[2]));
  ctx.globalCompositeOperation = "lighter";
  for (const [lat, lng, weight] of points) {
    const point = map.latLngToContainerPoint([lat, lng]);
    const radius = 40;
    const strength = 0.4 + 0.6 * (weight / max);
    const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    gradient.addColorStop(0, `rgba(255, 244, 214, ${0.85 * strength})`);
    gradient.addColorStop(0.35, `rgba(225, 6, 0, ${0.75 * strength})`);
    gradient.addColorStop(0.72, `rgba(225, 6, 0, ${0.28 * strength})`);
    gradient.addColorStop(1, "rgba(225, 6, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
