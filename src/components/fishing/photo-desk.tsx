import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { LoaderCircle } from "lucide-react";
import fishButton from "@/assets/fish-button.jpg";
import { BaitPicker } from "@/components/fishing/bait-picker";
import { suggestedFilename } from "@/lib/fishing/advisor";
import { getConditions } from "@/lib/fishing/conditions";
import { getPhotoWeather, meteoLines, type ModelRead } from "@/lib/fishing/photo-weather";
import { shrinkPhoto } from "@/lib/fishing/import-log";
import { captureStamp, readPhotoMeta, type PhotoMeta } from "@/lib/fishing/photo-meta";
import { savePhoto } from "@/lib/fishing/photos";
import { hoursAfterTurn, stageFromStation, tidePhrase } from "@/lib/fishing/station";
import { clockToMinutes, todayInCharleston } from "@/lib/fishing/time";
import type { CatchRow, MeteoSnap, PhotoRead, Species, TideStage, WindDir } from "@/lib/fishing/types";
import { SPECIES } from "@/lib/fishing/types";
import { readPhoto } from "@/lib/fishing/vision";

const field = "h-11 w-full rounded-lg border border-border bg-bg px-3 text-base text-fg md:text-sm";

type PlaceRead = {
  lat: number | null;
  lng: number | null;
  line: string;
  taken: string | null;
};

export function PhotoDesk({
  launch = false,
  initialFile = null,
  onOpenUpload,
  onAdd,
  onRecommend,
  onCancel,
  onLogged,
}: {
  launch?: boolean;
  initialFile?: File | null;
  onOpenUpload?: (file: File) => void;
  onAdd: (row: CatchRow) => void;
  onRecommend?: (setting: string, fish: Species | null) => void;
  onCancel?: () => void;
  onLogged?: () => void;
}) {
  const today = todayInCharleston();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [read, setRead] = useState<PhotoRead | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [logged, setLogged] = useState(false);
  const [settings, setSettings] = useState(false);
  const [species, setSpecies] = useState<Species | "">("");
  const [confidence, setConfidence] = useState<PhotoRead["confidence"] | "">("");
  const [lengthLow, setLengthLow] = useState("");
  const [lengthHigh, setLengthHigh] = useState("");
  const [basis, setBasis] = useState("");
  const [setting, setSetting] = useState("");
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("07:00");
  const [tide, setTide] = useState<TideStage>("outgoing");
  const [tideHours, setTideHours] = useState<number | null>(null);
  const [tideTurn, setTideTurn] = useState<"high" | "low" | "">("");
  const [water, setWater] = useState("");
  const [air, setAir] = useState("");
  const [windDir, setWindDir] = useState<WindDir | "">("");
  const [wind, setWind] = useState("");
  const [bait, setBait] = useState("");
  const [count] = useState("1");
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [place, setPlace] = useState<PlaceRead | null>(null);
  const [, setModels] = useState<ModelRead[]>([]);
  const [snap, setSnap] = useState<MeteoSnap | null>(null);
  void onRecommend;
  void confidence;

  const filename = useMemo(
    () => suggestedFilename({ date, species: species || "fish" }),
    [date, species],
  );

  useEffect(() => {
    if (initialFile) void onFile(initialFile);
    // The file is chosen once, before this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  useEffect(() => {
    if (!uploaded || !date || !start) return;
    let dead = false;
    void getConditions({ data: { date } })
      .then((result) => {
        if (dead || !result.ok) return;
        const minutes = clockToMinutes(start);
        if (minutes == null) return;
        const stage = stageFromStation(result.tides, minutes);
        if (stage) setTide(stage);
        const turn = hoursAfterTurn(result.tides, minutes);
        setTideHours(turn?.hours ?? null);
        setTideTurn(turn?.turn ?? "");
        if (result.waterSource === "gauge") setWater(String(result.waterF));
      })
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [uploaded, date, start]);

  useEffect(() => {
    if (!uploaded || lat == null || lng == null || !date || !start) {
      setModels([]);
      setSnap(null);
      return;
    }
    let dead = false;
    void getPhotoWeather({ data: { lat, lng, date, time: start } })
      .then((result) => {
        if (dead || !result) return;
        setModels(result.models);
        setSnap(result.snap);
        if (result.airF != null) setAir(String(Math.round(result.airF)));
        if (result.windMph != null) setWind(String(Math.round(result.windMph)));
        if (result.windDir) setWindDir(result.windDir);
        if (result.snap?.waterF != null) setWater(String(Math.round(result.snap.waterF)));
      })
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [uploaded, lat, lng, date, start]);

  useEffect(() => {
    if (!logged) return;
    const timer = window.setTimeout(() => onLogged?.(), 3000);
    return () => window.clearTimeout(timer);
  }, [logged, onLogged]);

  async function onFile(file: File) {
    setReading(true);
    setReadError(null);
    setUploaded(true);
    try {
      const meta = await readPhotoMeta(file);
      applyPlace(meta);
      const dataUrl = await previewUrl(file);
      setPreview(dataUrl);
      const result = await readPhoto({ data: { imageDataUrl: dataUrl } });
      if (!result.ok) {
        setReadError(result.message);
        return;
      }
      setRead(result);
      if (result.species) setSpecies(result.species);
      setConfidence(result.confidence);
      setLengthLow(result.lengthLow == null ? "" : String(result.lengthLow));
      setLengthHigh(result.lengthHigh == null ? "" : String(result.lengthHigh));
      setBasis(result.lengthBasis);
      setSetting(result.setting);
      setNotes(result.setting);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setReadError(message || "I couldn't read that photo. Type the species below.");
    } finally {
      setReading(false);
    }
  }

  function applyPlace(meta: PhotoMeta) {
    const stamp = meta.taken ? captureStamp(meta.taken) : null;
    if (stamp) {
      setDate(stamp.date);
      setStart(stamp.time);
    }
    setLat(meta.lat);
    setLng(meta.lng);
    setPlace({
      lat: meta.lat,
      lng: meta.lng,
      taken: stamp ? `${stamp.date} ${stamp.time}` : null,
      line:
        meta.lat != null && meta.lng != null
          ? `${meta.lat.toFixed(5)}, ${meta.lng.toFixed(5)}`
          : "No location stored in this photo.",
    });
  }

  function save() {
    const length = Number(lengthHigh || lengthLow);
    const row: CatchRow = {
      id: `u-${Date.now()}`,
      date,
      startTime: start,
      endTime: "",
      spotId: "",
      tideStage: tide,
      tideHours,
      tideTurn,
      waterTempF: water ? Number(water) : null,
      airTempF: air ? Number(air) : null,
      windDir,
      windMph: wind ? Number(wind) : null,
      bait,
      species,
      count: Math.max(0, Number(count) || 0),
      lengthIn: Number.isFinite(length) && length > 0 ? length : null,
      weightLb: null,
      photoFilename: filename,
      notes,
      source: "you",
      lat,
      lng,
      meteo: loggedSnap(snap, tidePhrase({ tideStage: tide, tideHours, tideTurn }), water, air, wind, windDir),
    };
    onAdd(row);
    if (preview) void savePhoto(row.id, preview).catch(() => undefined);
    setLogged(true);
  }

  if (launch) {
    return (
      <section id="photo-desk" className="space-y-3">
        <LogHeading settings={settings} onToggle={() => setSettings((open) => !open)} />
        {settings ? <PhoneSettings /> : null}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="fish-upload flex h-36 w-full items-center justify-center rounded-xl px-4 text-center"
          style={{ backgroundImage: `url(${fishButton})` }}
        >
          Upload Your Fish Photo!
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onOpenUpload?.(file);
          }}
        />
      </section>
    );
  }

  return (
    <section id="photo-desk" className="space-y-4">
      <LogHeading
        title={review ? "Confirm this catch" : "Log My Fish"}
        settings={settings}
        onToggle={() => setSettings((open) => !open)}
      />
      {settings && !review ? <PhoneSettings /> : null}
      {preview ? (
        <img src={preview} alt="The catch you are logging" className="max-h-80 w-full rounded-xl object-cover" />
      ) : null}
      {reading ? <p className="text-sm text-muted">Reading the photo…</p> : null}
      {readError ? <p className="text-sm text-danger">{readError}</p> : null}

      {uploaded && !review ? (
        <>
          {read?.species ? (
            <p className="text-sm text-fg">
              Best guess: {read.species}
              {read.speciesAlt ? ` (could also be ${read.speciesAlt})` : ""}.{" "}
              {read.lengthLow && read.lengthHigh
                ? `About ${read.lengthLow}–${read.lengthHigh} in, ${read.lengthBasis}. Not a legal measurement.`
                : "No reliable length — nothing in the frame to scale it."}
            </p>
          ) : null}
          <div className="rounded-lg bg-bg p-3">
            <p className="text-sm font-semibold text-red-700">What bait did you use? Required.</p>
            {!bait ? <p className="mt-1 text-sm font-semibold text-red-700">Pick a bait before you confirm this catch.</p> : null}
            <div className="mt-2">
              <BaitPicker value={bait} onChange={setBait} />
            </div>
          </div>
          {snap ? (
            <div className="rounded-lg bg-bg p-3 text-sm">
              <p className="font-medium text-fg">Conditions at this photo</p>
              <ul className="mt-2 space-y-1">
                {meteoLines(
                  loggedSnap(snap, tidePhrase({ tideStage: tide, tideHours, tideTurn }), water, air, wind, windDir) ??
                    snap,
                ).map(([label, value]) => (
                  <li key={label} className="text-muted">
                    <span className="text-fg">{label}</span>
                    {` · ${value}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReview(true)}
              disabled={!bait}
              className="h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Confirm My Catch
            </button>
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white"
            >
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {review && !logged ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted">
              Date
              <input type="date" className={field} value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="text-sm text-muted">
              Time of catch
              <input type="time" className={field} value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label className="text-sm text-muted">
              Species
              <select
                className={field}
                value={species}
                onChange={(event) => setSpecies(event.target.value as Species | "")}
              >
                <option value="">Unconfirmed</option>
                {SPECIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              Approximate length (in)
              <input
                className={field}
                inputMode="decimal"
                value={lengthHigh || lengthLow}
                onChange={(event) => {
                  setLengthHigh(event.target.value);
                  setLengthLow("");
                }}
              />
            </label>
          </div>
          {basis ? <p className="text-sm text-muted">Length basis: {basis}. Not a legal measurement.</p> : null}
          {place ? <p className="text-sm text-muted">{place.line}</p> : null}
          {lat != null && lng != null ? <PhotoPin lat={lat} lng={lng} /> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!bait}
              className="h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Confirm My Catch
            </button>
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white"
            >
              Cancel
            </button>
          </div>
        </>
      ) : null}

      {logged ? (
        <div className="fixed inset-0 z-[1100] flex flex-col items-center justify-center gap-8 bg-bg px-6">
          <LoaderCircle className="size-20 animate-spin text-accent" aria-hidden="true" />
          <p className="text-center text-5xl leading-tight text-fg md:text-7xl">Catch Successfully Logged!</p>
        </div>
      ) : null}
    </section>
  );
}

function LogHeading({
  title = "Log My Fish",
  settings,
  onToggle,
}: {
  title?: string;
  settings: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-3xl text-fg">{title}</h2>
      {title === "Log My Fish" ? (
        <button type="button" onClick={onToggle} className="text-sm text-accent underline">
          {settings ? "Hide picture settings" : "Check My Phone Picture Settings"}
        </button>
      ) : null}
    </div>
  );
}

function PhoneSettings() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
      <p className="text-fg">
        The catch pin, the time, and the tide come from the original photo. The camera has to save location and the time
        taken. A text, a social post, a screenshot, or an edited copy usually strips both.
      </p>
      <div>
        <h3 className="text-base text-fg">iPhone</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
          <li>Settings, Privacy & Security, Location Services: turn Location Services on.</li>
          <li>Location Services, Camera: set it to While Using the App.</li>
          <li>On that same Camera page, turn Precise Location on.</li>
          <li>Settings, Camera, Formats: choose Most Compatible so the photo is a JPEG this app can read.</li>
          <li>Take the picture in the Camera app, then upload that original from the camera roll. Do not send it through Messages first.</li>
        </ol>
      </div>
      <div>
        <h3 className="text-base text-fg">Android</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
          <li>Turn the phone's Location on.</li>
          <li>Open the Camera app, then its Settings, and turn Location tags on. Some phones call it Save location.</li>
          <li>On a Samsung phone that switch is Camera, Settings, Location tags. On Google Camera it is the settings gear, then Location tags.</li>
          <li>Upload the original from the gallery. A photo sent through a text or chat app usually arrives with no location.</li>
        </ol>
      </div>
    </div>
  );
}

function PhotoPin({ lat, lng }: { lat: number; lng: number }) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    void import("leaflet").then((mod) => {
      if (dead || mapRef.current) return;
      const L = mod.default ?? mod;
      const map = L.map(el, { zoomControl: true, attributionControl: true, zoomSnap: 0.1 });
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
      map.setView([lat, lng], 14.6);
      L.circleMarker([lat, lng], { radius: 8, color: "#1c3d36", weight: 2, fillOpacity: 0.9 }).addTo(map);
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
    });
    return () => {
      dead = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return <div ref={host} className="catch-map h-64 min-h-64" role="application" aria-label="Where this photo was taken" />;
}

function loggedSnap(
  snap: MeteoSnap | null,
  tide: string,
  water: string,
  air: string,
  wind: string,
  windDir: WindDir | "",
): MeteoSnap | null {
  if (!snap) return null;
  return {
    ...snap,
    tideStage: tide,
    waterF: water ? Number(water) : snap.waterF,
    airF: air ? Number(air) : snap.airF,
    windMph: wind ? Number(wind) : snap.windMph,
    windDir: windDir || snap.windDir,
  };
}

async function previewUrl(file: File): Promise<string> {
  try {
    return await shrinkPhoto(file);
  } catch {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
