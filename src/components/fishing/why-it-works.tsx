import { useState } from "react";
import creek from "@/assets/why-creek.jpg";
import catchPhoto from "@/assets/why-catch.jpg";
import tide from "@/assets/why-tide.jpg";

export function WhyItWorks() {
  const [more, setMore] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl text-fg">Why it Works</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          FishBiteIQ learns your water from the fish you actually catch. A photo becomes a record. Those records,
          checked against the day ahead, are what the projections are built from.
        </p>
      </div>

      <img
        src={creek}
        alt="A skiff on a Lowcountry creek beside an oyster bank at first light"
        className="max-h-80 w-full rounded-xl object-cover"
      />

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-xl text-fg">What the photo keeps</h3>
          <p className="mt-2 text-sm text-muted">
            The original picture holds the GPS pin and the time it was taken. The app reads the fish, estimates a
            length, and asks you to confirm both, plus the bait. A text, a screenshot, or an edited copy usually loses
            the pin.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-xl text-fg">What gets looked up</h3>
          <p className="mt-2 text-sm text-muted">
            For that place and minute, the catch log stores the tide and how many hours after the turn it was, water
            temperature, wind, barometer and whether it was rising or falling, clouds, rain, waves, the moon, and the
            solunar periods. You do not type the weather.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-xl text-fg">How a projection is made</h3>
          <p className="mt-2 text-sm text-muted">
            Only trips that match your question are used. Each is scored against that day's forecast, then grouped by
            photo pin. The strongest group gets a tide window, a bait, and a reason.
          </p>
          {more ? (
            <div className="mt-2 space-y-2 text-sm text-muted">
              <p>
                The question can name a fish, a day, a time, a tide, a bait, or a waypoint. A named place stays near
                that pin. Everything else in the catch log is set aside.
              </p>
              <p>
                A past trip scores higher in the same month, under a similar moon, and in similar wind, water, air,
                pressure, and waves. The same pressure trend counts too. Close matches are kept. If the coming day does
                not look like the catch log, the answer says the match is thin.
              </p>
              <p>
                Those trips are grouped where the photos were taken. The time is their tide, placed on the Charleston
                tide as hours after the turn. The bait is the one that caught the most fish in that group, not the one
                used most often. A solunar major is mentioned only when it overlaps that window.
              </p>
              <p>
                No place is recommended unless you have logged it. A trip with no fish still counts. Fish Trends and
                personal bests count the catch log. They do not predict the day ahead.
              </p>
            </div>
          ) : null}
          <button type="button" onClick={() => setMore((open) => !open)} className="mt-2 text-sm text-accent underline">
            {more ? "Less" : "More"}
          </button>
        </article>
      </section>

      <img
        src={catchPhoto}
        alt="A red drum on a measuring board next to a phone on a boat deck"
        className="max-h-80 w-full rounded-xl object-cover"
      />

      <section className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xl text-fg">The catch log does the advising</h3>
        <ul className="mt-2 space-y-2 text-sm text-muted">
          <li>Fish Trends shows the conditions that have produced each species, including pressure and moon phase.</li>
          <li>Personal bests are the longest fish, the best month, and the best bait, taken only from the catch log.</li>
          <li>Named waypoints, such as an oyster point, get reused the next time that water comes up.</li>
          <li>The catch log stays on this device. Download backup keeps the trips, the photos, and the waypoint names.</li>
        </ul>
      </section>

      <img
        src={tide}
        alt="Tide moving past oyster and marsh grass under a changing sky"
        className="max-h-72 w-full rounded-xl object-cover"
      />
      <p className="max-w-2xl text-sm text-muted">
        The more confirmed catches you add, the sharper the next recommendation gets. A blank trip matters too. It
        keeps a good day from looking like it happens every time.
      </p>
    </div>
  );
}
