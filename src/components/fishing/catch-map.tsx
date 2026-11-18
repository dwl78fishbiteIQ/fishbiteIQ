import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { catchPins, type CatchPin } from "@/lib/fishing/pins";
import { tidePhrase } from "@/lib/fishing/station";
import { formatPrettyDate } from "@/lib/fishing/time";
import type { CatchRow, Species } from "@/lib/fishing/types";
import { SPECIES } from "@/lib/fishing/types";
import { nearestWaypoint, type Waypoint } from "@/lib/fishing/waypoints";
import { cn } from "@/lib/cn";

export function CatchMap({
  rows,
  compact = false,
  waypoints = [],
  onOpenTrip,
  onSaveWaypoint,
  onDeleteWaypoint,
}: {
  rows: CatchRow[];
  compact?: boolean;
  waypoints?: Waypoint[];
  onOpenTrip?: (id: string) => void;
  onSaveWaypoint?: (name: string, lat: number, lng: number) => void;
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
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState("");
  const compactRef = useRef(compact);
  compactRef.current = compact;
  const clickRef = useRef<(lat: number, lng: number) => void>(() => {});
  clickRef.current = (lat, lng) => {
    if (compactRef.current) return;
    setDraft({ lat, lng });
  };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    let detachResize = () => {};
    void import("leaflet").then((mod) => {
      if (dead || mapRef.current) return;
      const L = mod.default ?? mod;
      const map = L.map(el, { zoomControl: true, attributionControl: true });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_56l7_1_5fea1cdef7e7db7fa70b39ed",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
          maxNativeZoom: 18,
        },
      ).addTo(map);
      map.setView([32.78, -79.88], 11);
      map.on("click", (event) => clickRef.current(event.latlng.lat, event.latlng.lng));
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
      const accent = root.getPropertyValue("--color-accent").trim();
      const ink = root.getPropertyValue("--color-accent-fg").trim();
      const surface = root.getPropertyValue("--color-surface-2").trim();
      for (const pin of pins) {
        const active = pin.id === selected?.id;
        const empty = pin.fish === 0;
        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: empty ? 9 : Math.min(20, 9 + Math.sqrt(pin.fish)),
          color: active ? ink : accent,
          weight: active ? 3 : 2,
          fillColor: empty ? surface : accent,
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
      for (const mark of waypoints) {
        const marker = L.circleMarker([mark.lat, mark.lng], {
          radius: 7,
          color: "#1c3d36",
          weight: 2,
          fillColor: "#f4e7c5",
          fillOpacity: 1,
        });
        marker.bindTooltip(mark.name, { direction: "top" });
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          setDraft({ lat: mark.lat, lng: mark.lng });
          setName(mark.name);
        });
        marker.addTo(group);
      }
      const spots = [
        ...pins.map((pin) => [pin.lat, pin.lng] as [number, number]),
        ...waypoints.map((mark) => [mark.lat, mark.lng] as [number, number]),
      ];
      const key = `${pins.map((pin) => pin.id).join("|")}#${waypoints.map((mark) => mark.id).join("|")}`;
      if (spots.length && fitted.current !== key) {
        fitted.current = key;
        map.fitBounds(L.latLngBounds(spots), { padding: [36, 36], maxZoom: 13 });
      }
      if (!spots.length) {
        fitted.current = "";
        map.setView([32.78, -79.88], 11);
      }
    });
    return () => {
      dead = true;
    };
  }, [pins, waypoints, selected?.id, ready, onOpenTrip]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl text-fg">Catch map</h2>
          <p className="text-sm text-muted">
            {filtered.length} trips across {pins.length} {pins.length === 1 ? "place" : "places"}. Photo
            GPS is used when a trip has it. Everything else sits on the guide spot.
            {compact ? "" : " Tap the map to name a waypoint."}
          </p>
        </div>
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

      <div className="overflow-hidden rounded-xl border border-border">
        <div
          ref={host}
          className={compact ? "catch-map is-compact" : "catch-map"}
          role="application"
          aria-label="Map of catches"
        />
      </div>

      {!compact && (draft || selected) ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const at = draft ?? (selected ? { lat: selected.lat, lng: selected.lng } : null);
            if (!at || !name.trim()) return;
            onSaveWaypoint?.(name, at.lat, at.lng);
            setName("");
            setDraft(null);
          }}
        >
          <input
            className="h-11 min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={draft ? "Name this pin" : "Name the selected catch place"}
            aria-label="Waypoint name"
          />
          <button type="submit" className="h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg">
            Save waypoint
          </button>
        </form>
      ) : null}

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

      {pins.length === 0 ? (
        <p className="text-sm text-muted">Nothing to plot for that filter.</p>
      ) : compact ? null : (
        <ul className="grid gap-2 md:grid-cols-2">
          {pins.map((pin) => {
            const active = pin.id === selected?.id;
            return (
              <li key={pin.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(pin.id);
                    mapRef.current?.panTo([pin.lat, pin.lng]);
                  }}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left",
                    active ? "border-accent bg-surface" : "border-border bg-surface",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-fg">
                      {nearestWaypoint(pin.lat, pin.lng, waypoints, 0.4)?.name ?? pin.title}
                    </span>
                    <span className="text-sm font-semibold text-accent tabular-nums">
                      {pin.fish} fish
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {pin.area} · {pin.rows.length} {pin.rows.length === 1 ? "trip" : "trips"}
                    {pin.photoCount ? ` · ${pin.photoCount} from photo GPS` : ""}
                  </span>
                </button>
                {active ? (
                  <ul className="mt-2 space-y-2">
                    {pin.rows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => onOpenTrip?.(row.id)}
                          className="w-full rounded-lg bg-bg px-3 py-2 text-left text-sm"
                        >
                          <p className="text-fg tabular-nums">
                            {formatPrettyDate(row.date)}
                            {row.startTime ? ` · ${row.startTime}` : ""}
                          </p>
                          <p className="text-muted">
                            {row.count} {row.species}
                            {row.lengthIn ? ` · ${row.lengthIn} in` : ""} · {tidePhrase(row)}
                            {row.lat != null && row.lng != null
                              ? ` · ${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}`
                              : ""}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
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
