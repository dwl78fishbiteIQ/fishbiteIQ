export const SPECIES = [
  "Red Drum",
  "Spotted Seatrout",
  "Flounder",
  "Sheepshead",
  "Black Drum",
  "Whiting",
] as const;

export type Species = (typeof SPECIES)[number];

export const TIDE_STAGES = ["outgoing", "incoming", "high slack", "low slack"] as const;
export type TideStage = (typeof TIDE_STAGES)[number];

export const WIND_DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type WindDir = (typeof WIND_DIRS)[number];

export const AREAS = [
  "Mt. Pleasant",
  "Barrier Islands",
  "Charleston Harbor",
  "West Ashley",
] as const;
export type Area = (typeof AREAS)[number];

export type Spot = {
  id: string;
  name: string;
  aliases: string[];
  area: Area;
  lat: number;
  lng: number;
  depth: string;
  structure: string;
  bestTides: string;
  /** Minutes after the Charleston harbor gauge. Negative means earlier. */
  offsetMin: number;
  /** Ocean swell matters here. */
  exposed: boolean;
  image?: string;
  blurb: string;
};

export type CatchRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  spotId: string;
  tideStage: TideStage;
  /** Rounded hours after the last high or low. Negative means that turn is still ahead. */
  tideHours?: number | null;
  tideTurn?: "high" | "low" | "";
  waterTempF: number | null;
  airTempF: number | null;
  windDir: WindDir | "";
  windMph: number | null;
  bait: string;
  species: Species | "";
  count: number;
  lengthIn: number | null;
  weightLb: number | null;
  photoFilename: string;
  notes: string;
  source: "sample" | "you";
  /** Decimal degrees from the photo file, when the camera stored them. */
  lat?: number | null;
  lng?: number | null;
  /** Open-Meteo reading for the photo's place and hour. */
  meteo?: MeteoSnap | null;
};

export type MeteoSnap = {
  airF: number | null;
  feelsF: number | null;
  dewF: number | null;
  humidity: number | null;
  pressureHpa: number | null;
  precipIn: number | null;
  precipPct: number | null;
  rainIn: number | null;
  cloudPct: number | null;
  visibilityMi: number | null;
  gustMph: number | null;
  windMph: number | null;
  windDir: WindDir | "";
  weatherCode: number | null;
  waterF: number | null;
  waveFt: number | null;
  wavePeriodS: number | null;
  waveDir: WindDir | "";
  swellFt: number | null;
  swellDir: WindDir | "";
  tideStage: string;
  currentKt: number | null;
  currentText: string;
  pressureTrend: "" | "rising" | "falling" | "stable";
  precip24In: number | null;
  precip48In: number | null;
  precip72In: number | null;
  /** Positive means the front already passed. Negative means it is still ahead. */
  frontHours: number | null;
};

export type HourPoint = {
  at: number;
  tideFt: number | null;
  airF: number | null;
  windMph: number | null;
  windDeg: number | null;
  precipPct: number | null;
  weatherCode: number | null;
  waveFt: number | null;
};

export type TideEvent = {
  at: number;
  type: "H" | "L";
  heightFt: number;
};

export type Conditions = {
  ok: true;
  date: string;
  stationId: "8665530";
  stationName: string;
  tides: TideEvent[];
  hourly: HourPoint[];
  daylight: {
    windLow: number | null;
    windHigh: number | null;
    windDeg: number | null;
    windDir: WindDir | null;
    airHigh: number | null;
    airLow: number | null;
    precipPct: number | null;
    weatherCode: number | null;
    weatherLabel: string;
    waveFt: number | null;
    storm: boolean;
  };
  waterF: number;
  waterSource: "gauge" | "seasonal";
  weatherKnown: boolean;
  pressureHpa: number | null;
  pressureTrend: "" | "rising" | "falling" | "stable";
  cloudPct: number | null;
  humidity: number | null;
  gustMph: number | null;
};

export type Citation = {
  id: string;
  doc: "Catch log" | "Spot guide" | "Seasonal notes";
  label: string;
};

export type SpotPick = {
  rank: number;
  spotId: string;
  /** Name to show when this pick is a catch-log location, not a guide spot. */
  place?: string;
  lat?: number;
  lng?: number;
  waterway?: string;
  landing?: string;
  landingLat?: number;
  landingLng?: number;
  /** One or two sentences on why this place was picked. */
  why?: string;
  windowLabel: string;
  tideStage: TideStage;
  reasons: string[];
  citations: Citation[];
  /** True when this is a pattern for a calmer day, not a launch time. */
  deferred: boolean;
};

export type LogFact = {
  label: string;
  detail: string;
  citations: Citation[];
};

export type SeasonNote = {
  species: Species;
  text: string;
  badge: "Catch log" | "General";
  logLine: string | null;
};

export type ConditionsResult =
  | Conditions
  | { ok: false; date: string; message: string };

export type PhotoRead = {
  ok: true;
  kind: "catch" | "spot" | "unclear";
  species: Species | null;
  speciesAlt: Species | null;
  confidence: "high" | "medium" | "low";
  features: string[];
  lengthLow: number | null;
  lengthHigh: number | null;
  lengthBasis: string;
  setting: string;
};

export type PhotoResult = PhotoRead | { ok: false; message: string };

export type Advice = {
  mode: "predict" | "log" | "season" | "photo" | "clarify" | "unsafe";
  headline: string;
  lede: string;
  confidence: "high" | "medium" | "low" | null;
  confidenceWhy: string;
  /** Full prompts the user can send in one tap. */
  questions: string[];
  safety: string | null;
  picks: SpotPick[];
  logFacts: LogFact[];
  seasonNotes: SeasonNote[];
  reminders: string[];
};
