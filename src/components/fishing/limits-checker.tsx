import { useState } from "react";
import { gigClosed, lengthVerdict, LIMITS, LIMITS_SOURCE, seasonLine } from "@/lib/fishing/limits";
import { formatPrettyDate, todayInCharleston } from "@/lib/fishing/time";
import { cn } from "@/lib/cn";

export function LimitsChecker() {
  const today = todayInCharleston();
  const [speciesId, setSpeciesId] = useState(LIMITS[0].id);
  const [length, setLength] = useState("");
  const rule = LIMITS.find((item) => item.id === speciesId) ?? LIMITS[0];
  const inches = Number(length);
  const hasLength = length.trim() !== "" && Number.isFinite(inches) && inches > 0;
  const verdict = hasLength ? lengthVerdict(rule, inches) : null;
  const gig = rule.gigClosesInWinter && gigClosed(today);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl text-fg">Regulations & limits checker</h2>
        <p className="max-w-2xl text-sm text-muted">
          South Carolina state waters, from the 2026–2027 guide updated August 11, 2026. The season
          line follows today's date. This is not a legal measurement or a substitute for SCDNR.
        </p>
      </div>

      <p className="rounded-xl border-2 border-accent bg-surface p-4 text-sm text-fg">
        {formatPrettyDate(today)}. {seasonLine(today)}
      </p>

      <form className="space-y-3 rounded-xl border border-border bg-surface p-4" onSubmit={(event) => event.preventDefault()}>
        <label className="block text-sm text-muted" htmlFor="limit-species">
          Species
          <select
            id="limit-species"
            value={speciesId}
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
        <label className="block text-sm text-muted" htmlFor="limit-length">
          Length in inches, if you want a size check
          <input
            id="limit-length"
            inputMode="decimal"
            value={length}
            onChange={(event) => setLength(event.target.value)}
            placeholder="22"
            className="mt-1 h-11 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg"
          />
        </label>
        <div className="rounded-lg bg-bg p-3 text-sm text-fg">
          <p className="font-semibold">{rule.name}</p>
          <p>{rule.size}</p>
          <p>{rule.bag}</p>
          <p className="mt-1 text-muted">{rule.note}</p>
          {gig ? <p className="mt-1 text-danger">Gig closed for this season.</p> : null}
          {verdict === "legal" ? <p className="mt-2 font-semibold text-go">{inches} in is inside the published size.</p> : null}
          {verdict === "short" ? <p className="mt-2 font-semibold text-danger">{inches} in is short of {rule.minIn} in.</p> : null}
          {verdict === "over" ? <p className="mt-2 font-semibold text-danger">{inches} in is over the {rule.maxIn} in slot.</p> : null}
          {verdict === "unlisted" ? <p className="mt-2 text-muted">No size limit is listed, so this length is not checked.</p> : null}
        </div>
      </form>

      <ul className="grid gap-3 md:grid-cols-2">
        {LIMITS.map((item) => {
          const closed = item.gigClosesInWinter && gigClosed(today);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSpeciesId(item.id)}
                className={cn(
                  "h-full w-full rounded-xl border p-4 text-left",
                  item.id === speciesId ? "border-accent bg-surface" : "border-border bg-surface",
                )}
              >
                <p className="text-lg text-fg">{item.name}</p>
                <p className="text-sm text-fg">{item.size}</p>
                <p className="text-sm text-muted">{item.bag}</p>
                <p className={cn("mt-2 text-sm font-semibold", closed ? "text-danger" : "text-go")}>
                  {closed ? "Gig closed now" : item.gigClosesInWinter ? "Open, including gig" : "Open"}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-muted">
        A length guessed from a photo is not a legal measurement. You still need a saltwater fishing
        license if you are 16 or older.{" "}
        <a className="text-accent underline" href={LIMITS_SOURCE} target="_blank" rel="noreferrer">
          Official SC finfish limits
        </a>
      </p>
    </div>
  );
}
