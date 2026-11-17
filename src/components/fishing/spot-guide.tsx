import { SPOTS } from "@/lib/fishing/spots";

export function SpotGuide() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl text-fg">Spot guide</h2>
        <p className="max-w-2xl text-sm text-muted">
          Public water this guide already covers. Depths and tide offsets are approximate.
        </p>
      </div>
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
    </div>
  );
}
