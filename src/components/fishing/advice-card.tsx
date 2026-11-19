import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle } from "lucide-react";
import { addPlaceLabels } from "@/lib/fishing/map-labels";
import { spotById } from "@/lib/fishing/spots";
import type { Advice } from "@/lib/fishing/types";
import { cn } from "@/lib/cn";

export function AdviceCard({
  prompt,
  advice,
  pending,
  onAsk,
  onOpenTrip,
}: {
  prompt: string;
  advice: Advice | null;
  pending: string | null;
  onAsk: (prompt: string) => void;
  onOpenTrip: (id: string) => void;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4" aria-live="polite">
      <p className="text-sm text-muted">{prompt}</p>
      {pending || !advice ? (
        <p className="mt-3 text-fg">{pending ?? "Working…"}</p>
      ) : (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl text-fg">{advice.headline}</h3>
            {advice.confidence ? <Confidence level={advice.confidence} /> : null}
          </div>
          <p className="mt-2 text-fg">{advice.lede}</p>
          {advice.confidenceWhy ? (
            <p className="mt-1 text-sm text-muted">{advice.confidenceWhy}</p>
          ) : null}
          {advice.safety ? (
            <p className="mt-3 flex gap-2 rounded-lg border border-accent bg-bg px-3 py-2 text-sm text-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span>{advice.safety}</span>
            </p>
          ) : null}

          {advice.questions.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {advice.questions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onAsk(q)}
                  className="h-11 rounded-lg border border-border bg-bg px-3 text-left text-sm text-fg hover:border-accent"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}

          <ol className="mt-4 space-y-3">
            {advice.picks.map((pick) => {
              const spot = spotById(pick.spotId);
              const name = pick.place ?? spot?.name ?? "Logged catch";
              const lat = pick.lat ?? spot?.lat;
              const lng = pick.lng ?? spot?.lng;
              return (
                <li key={`${pick.rank}-${pick.spotId}`} className="rounded-lg bg-bg p-3">
                  <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                    {pick.deferred ? "For a calmer day" : `Pick ${pick.rank}`}
                  </p>
                  <p className="text-lg text-fg">{name}</p>
                  {pick.why ? <p className="mt-1 text-sm text-fg">{pick.why}</p> : null}
                  {pick.waterway ? <p className="text-sm text-fg">{pick.waterway}</p> : null}
                  {pick.landing ? (
                    <p className="text-sm text-muted">
                      Closest public landing · {pick.landing}
                      {pick.landingLat != null && pick.landingLng != null ? (
                        <>
                          {" · "}
                          <a
                            className="text-accent underline"
                            href={`https://www.google.com/maps/dir/?api=1&destination=${pick.landingLat},${pick.landingLng}&travelmode=driving`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Directions
                          </a>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted">
                    {spot?.area ? `${spot.area} · ` : ""}
                    {pick.tideStage}
                  </p>
                  <p className="mt-1 text-sm font-medium text-fg tabular-nums">{pick.windowLabel}</p>
                  {pick.reasons.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg">
                      {pick.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Citations citations={pick.citations} onOpenTrip={onOpenTrip} />
                  {lat != null && lng != null ? <PickMap lat={lat} lng={lng} name={name} /> : null}
                </li>
              );
            })}
          </ol>

          {advice.logFacts.length ? (
            <div className="mt-4 space-y-3">
              {advice.logFacts.map((fact) => (
                <div key={fact.label}>
                  <h4 className="text-base text-fg">{fact.label}</h4>
                  <p className="text-sm text-fg">{fact.detail}</p>
                  <Citations citations={fact.citations} onOpenTrip={onOpenTrip} />
                </div>
              ))}
            </div>
          ) : null}

          {advice.seasonNotes.length ? (
            <ul className="mt-4 space-y-3">
              {advice.seasonNotes.map((note) => (
                <li key={note.species} className="rounded-lg bg-bg p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base text-fg">{note.species}</h4>
                    <Badge general={note.badge === "General"} label={note.badge} />
                  </div>
                  <p className="mt-1 text-sm text-fg">{note.text}</p>
                  {note.logLine ? <p className="mt-1 text-sm text-muted">{note.logLine}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 border-t border-border pt-3 text-sm text-muted">
            {advice.reminders.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-2">
              <a
                className="text-accent underline"
                href="https://www.dnr.sc.gov/marine/"
                target="_blank"
                rel="noreferrer"
              >
                SCDNR marine
              </a>
              {" · "}
              <a
                className="text-accent underline"
                href="https://www.weather.gov/chs/"
                target="_blank"
                rel="noreferrer"
              >
                NWS Charleston
              </a>
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function PickMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    void import("leaflet").then((mod) => {
      if (dead || mapRef.current) return;
      const L = mod.default ?? mod;
      const map = L.map(el, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
      });
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 },
      ).addTo(map);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 },
      ).addTo(map);
      map.setView([lat, lng], 13);
      addPlaceLabels(L, map);
      L.circleMarker([lat, lng], {
        radius: 8,
        color: "#1a1208",
        weight: 2,
        fillColor: "#e08a3c",
        fillOpacity: 0.95,
      }).addTo(map);
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
    });
    return () => {
      dead = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div className="mt-2">
      <div ref={host} className="pick-map" role="img" aria-label={`Map of ${name}`} />
      <p className="mt-1 text-xs text-muted">© OpenStreetMap, CARTO</p>
    </div>
  );
}

function Citations({
  citations,
  onOpenTrip,
}: {
  citations: Advice["picks"][number]["citations"];
  onOpenTrip: (id: string) => void;
}) {
  if (!citations.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {citations.map((cite) => (
        <li key={`${cite.doc}-${cite.label}`}>
          {cite.id ? (
            <button
              type="button"
              onClick={() => onOpenTrip(cite.id)}
              className="text-left text-sm text-accent underline"
            >
              {cite.doc}: {cite.label}
            </button>
          ) : (
            <p className="text-sm text-muted">
              {cite.doc}: {cite.label}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function Confidence({ level }: { level: "high" | "medium" | "low" }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase",
        level === "high" ? "border-accent text-accent" : "border-border text-muted",
      )}
    >
      {level} confidence
    </span>
  );
}

function Badge({ general, label }: { general: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-semibold uppercase",
        general ? "border-border text-muted" : "border-accent text-accent",
      )}
    >
      {label}
    </span>
  );
}
