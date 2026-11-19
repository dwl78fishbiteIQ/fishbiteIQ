import { AmpText } from "@/components/fishing/amp-text";
import { PUBLIC_MARKS, PUBLIC_MARK_SOURCES } from "@/lib/fishing/public-structure";
import { describePlace } from "@/lib/fishing/waters";
import type { Waypoint } from "@/lib/fishing/waypoints";
import { SPOTS } from "@/lib/fishing/spots";

export function SpotGuide({ waypoints = [] }: { waypoints?: Waypoint[] }) {
  const yours = [...waypoints].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl text-fg">Spot guide</h2>
        <p className="max-w-2xl text-sm text-muted">
          Your named spots are listed with the public water this guide already covers. Depths and tide offsets on the
          public spots are approximate. <AmpText text="When & Where uses both." />
        </p>
      </div>
      <section className="space-y-3">
        <h3 className="text-xl text-fg">Your spots</h3>
        {yours.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {yours.map((spot) => {
              return (
                <li key={spot.id} className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold tracking-widest text-accent uppercase">Your spot</p>
                  <h3 className="text-2xl text-fg">{spot.name}</h3>
                  <p className="mt-2 text-sm text-fg">
                    Named from a photo. <AmpText text="Catches logged here are used in When & Where." />
                  </p>
                  <div className="mt-2">
                    <LandingRoute lat={spot.lat} lng={spot.lng} />
                  </div>
                  <p className="mt-2 text-xs text-muted tabular-nums">
                    {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            <AmpText text="None yet. Add a User Spot Name when you confirm a photo. It shows up here and in When & Where." />
          </p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="text-xl text-fg">Public spots</h3>
      <ul className="grid gap-4 md:grid-cols-2">
        {SPOTS.map((spot) => (
          <li key={spot.id} className="overflow-hidden rounded-xl border border-border bg-surface">
            {spot.image ? (
              <img
                src={spot.image}
                alt={spot.name}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="flex h-44 flex-col justify-end bg-surface-2 p-4">
                <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                  {spot.area}
                </p>
                <p className="text-3xl text-fg">{spot.name}</p>
              </div>
            )}
            <div className="space-y-2 p-4">
              <div>
                <h3 className="text-2xl text-fg">{spot.name}</h3>
                <p className="text-sm text-muted">{spot.area}</p>
              </div>
              <p className="text-sm text-fg">{spot.blurb}</p>
              <LandingRoute lat={spot.lat} lng={spot.lng} />
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted">Depth</dt>
                  <dd className="text-fg">{spot.depth}</dd>
                </div>
                <div>
                  <dt className="text-muted">Structure</dt>
                  <dd className="text-fg">{spot.structure}</dd>
                </div>
                <div>
                  <dt className="text-muted">Best tides</dt>
                  <dd className="text-fg">{spot.bestTides}</dd>
                </div>
                <div>
                  <dt className="text-muted">Tide offset</dt>
                  <dd className="text-fg tabular-nums">
                    {spot.offsetMin === 0
                      ? "About the harbor"
                      : `${Math.abs(spot.offsetMin)} min ${spot.offsetMin > 0 ? "later" : "earlier"}`}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted tabular-nums">
                {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                {spot.exposed ? " · exposed to ocean swell" : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
      </section>
      <section className="space-y-3">
        <h3 className="text-xl text-fg">Public flats and structure</h3>
        <p className="max-w-2xl text-sm text-muted">
          Inshore oyster flats and the near-inlet public reefs within 50 miles of Charleston Harbor.
          Tan dots are flats. Copper dots are reefs. Names show when the map is inside one mile.
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {PUBLIC_MARKS.map((mark) => (
            <li key={mark.id} className="space-y-1 px-4 py-3">
              <p className="text-fg">{mark.name}</p>
              <p className="text-sm text-muted">{mark.note}</p>
              <p className="text-xs text-muted tabular-nums">
                {mark.lat.toFixed(5)}, {mark.lng.toFixed(5)}
              </p>
              <LandingRoute lat={mark.lat} lng={mark.lng} />
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          {PUBLIC_MARK_SOURCES.map((source) => (
            <a key={source.href} className="mr-4 text-accent underline" href={source.href} target="_blank" rel="noreferrer">
              {source.label}
            </a>
          ))}
        </p>
      </section>
    </div>
  );
}

function LandingRoute({ lat, lng }: { lat: number; lng: number }) {
  const place = describePlace(lat, lng);
  return (
    <div className="text-sm">
      <p className="text-muted">Closest public landing · {place.landing}</p>
      <p className="text-fg">{place.directions}</p>
    </div>
  );
}
