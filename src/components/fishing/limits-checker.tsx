import { useEffect, useState } from "react";
import { AmpText } from "@/components/fishing/amp-text";
import { clearerPicture, pictureTitle } from "@/lib/fishing/fish-pictures";
import { LIMITS, LIMITS_SOURCE, seasonLine } from "@/lib/fishing/limits";
import { formatPrettyDate, todayInCharleston } from "@/lib/fishing/time";
import { cn } from "@/lib/cn";

const pictures = new Map<string, string | null>();

export function LimitsChecker() {
  const today = todayInCharleston();
  const [speciesId, setSpeciesId] = useState("red-drum");
  const rule = LIMITS.find((item) => item.id === speciesId) ?? LIMITS[0];
  const status = rule.season(today);
  const [photo, setPhoto] = useState<string | null>(pictures.get(rule.id) ?? null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);

  useEffect(() => {
    const title = pictureTitle(rule.id, rule.name);
    if (!title) {
      setPhoto(null);
      setPhotoNote("This entry covers more than one species, so there is not one picture.");
      return;
    }
    const cached = pictures.get(rule.id);
    if (cached !== undefined) {
      setPhoto(cached);
      setPhotoNote(cached ? null : "No clear picture is on file for this species.");
      return;
    }
    let cancel = false;
    setPhoto(null);
    setPhotoNote(null);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
    fetch(url, { headers: { accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { type?: string; thumbnail?: { source?: string }; originalimage?: { source?: string } } | null) => {
        if (cancel) return;
        const thumb = data && data.type !== "disambiguation" ? data.thumbnail?.source : null;
        const src = thumb ? clearerPicture(thumb) : data?.originalimage?.source ?? null;
        pictures.set(rule.id, src);
        setPhoto(src);
        setPhotoNote(src ? null : "No clear picture is on file for this species.");
      })
      .catch(() => {
        if (cancel) return;
        setPhoto(null);
        setPhotoNote("The picture did not load. Try this species again.");
      });
    return () => {
      cancel = true;
    };
  }, [rule.id, rule.name]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-3 text-3xl text-fg">
          <img src="/logos/scdnr-seal-color.png" alt="" className="h-[5.6rem] w-[5.6rem] shrink-0" />
          <AmpText text="SCDNR Saltwater Regulation & Limits Checker" />
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
        {photo ? (
          <img
            src={photo}
            alt={rule.name}
            className="mb-3 max-h-80 w-full rounded-lg bg-white object-contain"
          />
        ) : (
          <p className="mb-3 text-sm text-muted">{photoNote ?? "Loading the picture…"}</p>
        )}
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
