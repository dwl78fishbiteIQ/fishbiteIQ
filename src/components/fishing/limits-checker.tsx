import { useState } from "react";
import { AmpText } from "@/components/fishing/amp-text";
import { LIMITS, LIMITS_SOURCE, seasonLine } from "@/lib/fishing/limits";
import { formatPrettyDate, todayInCharleston } from "@/lib/fishing/time";
import { cn } from "@/lib/cn";

export function LimitsChecker() {
  const today = todayInCharleston();
  const [speciesId, setSpeciesId] = useState("red-drum");
  const rule = LIMITS.find((item) => item.id === speciesId) ?? LIMITS[0];
  const status = rule.season(today);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-3 text-3xl text-fg">
          <img src="/logos/scdnr-seal-color.png" alt="" className="h-[5.6rem] w-[5.6rem] shrink-0" />
          <AmpText text="Regulations & limits checker" />
        </h2>
        <p className="max-w-2xl text-sm text-muted">
          Every saltwater species in the 2026–2027 South Carolina guide, A to Z. Updated August 11,
          2026. The season line follows today's date. This is not a substitute for SCDNR.
        </p>
      </div>

      <p className="rounded-xl border-2 border-accent bg-surface p-4 text-sm text-fg">
        {formatPrettyDate(today)}. {seasonLine(today)}
      </p>

      <label className="block text-sm text-muted" htmlFor="limit-species">
        Select Species to check SCDNR regulations
        <select
          id="limit-species"
          value={rule.id}
          onChange={(event) => setSpeciesId(event.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg"
        >
          {LIMITS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-fg">
        <p className="font-semibold">{rule.name}</p>
        <p>{rule.size}</p>
        <p>{rule.bag}</p>
        <p className={cn("mt-1 font-semibold", status.closed ? "text-danger" : "text-go")}>{status.label}</p>
        <p className="mt-1 text-muted">{rule.note}</p>
      </div>

      <p className="text-sm text-muted">
        You still need a saltwater fishing license if you are 16 or older. Federal seasons can close
        when a quota is met.{" "}
        <a className="text-accent underline" href={LIMITS_SOURCE} target="_blank" rel="noreferrer">
          Official SC finfish limits
        </a>
      </p>
    </div>
  );
}
