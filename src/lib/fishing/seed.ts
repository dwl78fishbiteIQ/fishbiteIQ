import type { CatchRow, Species, TideStage, WindDir } from "@/lib/fishing/types";

type Draft = {
  date: string;
  start: string;
  spotId: string;
  tide: TideStage;
  water: number;
  windDir: WindDir;
  wind: number;
  bait: string;
  species: Species;
  count: number;
  length: number | null;
  notes?: string;
  photo?: string;
  weight?: number;
  air?: number;
  end?: string;
};

function rows(drafts: Draft[]): CatchRow[] {
  return drafts.map((d, i) => ({
    id: `s-${String(i + 1).padStart(2, "0")}`,
    date: d.date,
    startTime: d.start,
    endTime: d.end ?? "",
    spotId: d.spotId,
    tideStage: d.tide,
    waterTempF: d.water,
    airTempF: d.air ?? null,
    windDir: d.windDir,
    windMph: d.wind,
    bait: d.bait,
    species: d.species,
    count: d.count,
    lengthIn: d.length,
    weightLb: d.weight ?? null,
    photoFilename: d.photo ?? "",
    notes: d.notes ?? "",
    source: "sample",
  }));
}

/** A starter book so the advisor has something to cite before you add your own trips. */
export const SEED: CatchRow[] = rows([
  { date: "2025-10-18", start: "06:40", end: "09:30", spotId: "shem", tide: "outgoing", water: 68, air: 74, windDir: "NE", wind: 8, bait: "Live shrimp", species: "Red Drum", count: 4, length: 22, weight: 5, notes: "First of the outgoing on the oyster point." },
  { date: "2025-11-02", start: "07:10", end: "10:00", spotId: "shem", tide: "outgoing", water: 64, air: 70, windDir: "N", wind: 6, bait: "Paddle tail", species: "Red Drum", count: 3, length: 24, notes: "Chartreuse paddle tail along the docks." },
  { date: "2025-11-15", start: "16:20", end: "18:40", spotId: "shem", tide: "outgoing", water: 62, air: 66, windDir: "NW", wind: 10, bait: "Gold spoon", species: "Red Drum", count: 2, length: 19, photo: "2025-11-15_shem-creek_red-drum_outgoing.jpg", notes: "Afternoon outgoing. Smaller fish." },
  { date: "2026-10-11", start: "06:55", end: "09:40", spotId: "shem", tide: "outgoing", water: 70, air: 76, windDir: "NE", wind: 7, bait: "Mud minnow", species: "Red Drum", count: 5, length: 23, weight: 6, notes: "Best red morning of the fall at the creek mouth." },
  { date: "2026-10-24", start: "07:05", end: "09:50", spotId: "shem", tide: "outgoing", water: 66, air: 71, windDir: "E", wind: 9, bait: "Gulp shrimp", species: "Red Drum", count: 3, length: 21 },
  { date: "2026-11-01", start: "06:30", end: "09:20", spotId: "shem", tide: "outgoing", water: 63, air: 68, windDir: "N", wind: 8, bait: "Live shrimp", species: "Red Drum", count: 4, length: 26, weight: 8, photo: "2026-11-01_shem-creek_red-drum_outgoing.jpg", notes: "School on the oyster. One over the slot, released." },
  { date: "2026-11-07", start: "15:40", end: "18:10", spotId: "shem", tide: "outgoing", water: 61, air: 65, windDir: "NE", wind: 12, bait: "Paddle tail", species: "Red Drum", count: 2, length: 18, notes: "Later outgoing still worked. Not as good as dawn." },
  { date: "2026-11-02", start: "13:10", end: "14:30", spotId: "shem", tide: "high slack", water: 63, air: 69, windDir: "N", wind: 5, bait: "Live shrimp", species: "Red Drum", count: 0, length: null, notes: "Midday slack. Nothing moved." },
  { date: "2026-01-11", start: "08:00", end: "09:10", spotId: "shem", tide: "outgoing", water: 49, air: 44, windDir: "NW", wind: 16, bait: "Mud minnow", species: "Red Drum", count: 0, length: null, notes: "Too cold. Quit." },
  { date: "2026-07-22", start: "20:10", end: "22:30", spotId: "shem", tide: "outgoing", water: 84, air: 86, windDir: "SW", wind: 5, bait: "Live shrimp", species: "Spotted Seatrout", count: 4, length: 15, notes: "Dock lights." },
  { date: "2026-06-18", start: "07:00", end: "10:00", spotId: "shem", tide: "incoming", water: 82, air: 84, windDir: "SW", wind: 8, bait: "Carolina rig", species: "Flounder", count: 2, length: 16, notes: "Mud edge by the docks." },
  { date: "2025-10-26", start: "07:20", end: "10:00", spotId: "pitt", tide: "outgoing", water: 67, air: 73, windDir: "NE", wind: 6, bait: "Live shrimp", species: "Red Drum", count: 3, length: 21 },
  { date: "2026-10-31", start: "06:45", end: "09:30", spotId: "pitt", tide: "outgoing", water: 65, air: 70, windDir: "N", wind: 8, bait: "Mud minnow", species: "Red Drum", count: 4, length: 20, notes: "Bridge shadow on the first of the outgoing." },
  { date: "2026-11-08", start: "07:10", end: "09:50", spotId: "pitt", tide: "outgoing", water: 62, air: 66, windDir: "NE", wind: 9, bait: "Live shrimp", species: "Red Drum", count: 2, length: 23, photo: "2026-11-08_pitt-street_red-drum_outgoing.jpg" },
  { date: "2026-08-08", start: "19:40", end: "21:50", spotId: "pitt", tide: "outgoing", water: 83, air: 85, windDir: "S", wind: 7, bait: "Live shrimp", species: "Spotted Seatrout", count: 3, length: 14, notes: "Evening only." },
  { date: "2025-10-20", start: "07:30", end: "10:20", spotId: "breach", tide: "outgoing", water: 69, air: 74, windDir: "E", wind: 11, bait: "Live shrimp under a cork", species: "Spotted Seatrout", count: 6, length: 16, notes: "The cork bite was on." },
  { date: "2025-11-08", start: "06:50", end: "09:40", spotId: "breach", tide: "outgoing", water: 63, air: 67, windDir: "NE", wind: 9, bait: "Live shrimp under a cork", species: "Spotted Seatrout", count: 4, length: 18 },
  { date: "2026-10-17", start: "07:15", end: "10:10", spotId: "breach", tide: "outgoing", water: 68, air: 73, windDir: "SE", wind: 8, bait: "Popping cork", species: "Spotted Seatrout", count: 5, length: 17 },
  { date: "2026-11-03", start: "06:40", end: "09:30", spotId: "breach", tide: "outgoing", water: 62, air: 66, windDir: "N", wind: 10, bait: "Live shrimp under a cork", species: "Spotted Seatrout", count: 3, length: 19, photo: "2026-11-03_breach-inlet_seatrout_outgoing.jpg" },
  { date: "2025-11-09", start: "08:00", end: "10:40", spotId: "breach", tide: "outgoing", water: 64, air: 68, windDir: "N", wind: 12, bait: "Gold spoon", species: "Red Drum", count: 2, length: 20 },
  { date: "2026-11-06", start: "07:00", end: "09:40", spotId: "breach", tide: "outgoing", water: 62, air: 65, windDir: "NE", wind: 9, bait: "Mud minnow", species: "Red Drum", count: 3, length: 22 },
  { date: "2026-10-28", start: "07:40", end: "10:00", spotId: "breach", tide: "incoming", water: 67, air: 72, windDir: "E", wind: 14, bait: "Gulp shrimp", species: "Red Drum", count: 1, length: 17, notes: "Incoming was slow." },
  { date: "2026-10-19", start: "12:30", end: "13:20", spotId: "breach", tide: "outgoing", water: 70, air: 76, windDir: "SW", wind: 22, bait: "Gold spoon", species: "Red Drum", count: 0, length: null, notes: "Too windy. Came home." },
  { date: "2026-07-09", start: "06:30", end: "09:10", spotId: "breach", tide: "incoming", water: 84, air: 86, windDir: "S", wind: 6, bait: "Carolina rig", species: "Flounder", count: 1, length: 18 },
  { date: "2025-10-04", start: "08:30", end: "11:10", spotId: "copahee", tide: "outgoing", water: 72, air: 78, windDir: "NE", wind: 5, bait: "Gold spoon", species: "Red Drum", count: 6, length: 17, notes: "Tailers on the flat." },
  { date: "2025-11-01", start: "09:10", end: "11:40", spotId: "copahee", tide: "outgoing", water: 66, air: 71, windDir: "N", wind: 7, bait: "Gold spoon", species: "Red Drum", count: 4, length: 18 },
  { date: "2026-10-09", start: "08:45", end: "11:20", spotId: "copahee", tide: "outgoing", water: 71, air: 77, windDir: "E", wind: 6, bait: "Gold spoon", species: "Red Drum", count: 5, length: 18, notes: "Skinny water. Push pole, don't run it." },
  { date: "2026-11-05", start: "09:00", end: "11:30", spotId: "copahee", tide: "outgoing", water: 63, air: 67, windDir: "NW", wind: 8, bait: "Gold spoon", species: "Red Drum", count: 3, length: 16, photo: "2026-11-05_copahee_red-drum_outgoing.jpg" },
  { date: "2026-09-28", start: "07:00", end: "09:40", spotId: "copahee", tide: "outgoing", water: 76, air: 82, windDir: "E", wind: 8, bait: "Paddle tail", species: "Red Drum", count: 2, length: 15, notes: "Smaller fish." },
  { date: "2025-11-22", start: "09:40", end: "12:10", spotId: "wappoo", tide: "incoming", water: 60, air: 64, windDir: "N", wind: 6, bait: "Fiddler crab", species: "Sheepshead", count: 4, length: 14 },
  { date: "2026-11-04", start: "10:15", end: "12:40", spotId: "wappoo", tide: "incoming", water: 61, air: 66, windDir: "NE", wind: 7, bait: "Fiddler crab", species: "Sheepshead", count: 3, length: 16, notes: "Tight to the pilings." },
  { date: "2026-04-18", start: "09:20", end: "12:00", spotId: "wappoo", tide: "incoming", water: 66, air: 72, windDir: "S", wind: 8, bait: "Oyster crab", species: "Black Drum", count: 2, length: 22, weight: 7 },
  { date: "2026-03-02", start: "10:40", end: "13:00", spotId: "wappoo", tide: "incoming", water: 56, air: 62, windDir: "NE", wind: 9, bait: "Fiddler crab", species: "Sheepshead", count: 5, length: 13 },
  { date: "2026-09-02", start: "07:20", end: "10:00", spotId: "wappoo", tide: "incoming", water: 80, air: 84, windDir: "E", wind: 9, bait: "Carolina rig", species: "Flounder", count: 2, length: 17, notes: "Late summer. Check the season before keeping any." },
  { date: "2026-03-14", start: "10:00", end: "13:10", spotId: "jetty", tide: "incoming", water: 58, air: 64, windDir: "S", wind: 10, bait: "Fiddler crab", species: "Sheepshead", count: 8, length: 15, notes: "North jetty rocks. Seas were down." },
  { date: "2026-04-02", start: "11:20", end: "14:00", spotId: "jetty", tide: "incoming", water: 62, air: 70, windDir: "SW", wind: 8, bait: "Oyster crab", species: "Sheepshead", count: 5, length: 14 },
  { date: "2026-04-11", start: "08:30", end: "11:20", spotId: "jetty", tide: "incoming", water: 64, air: 69, windDir: "SE", wind: 12, bait: "Fiddler crab", species: "Sheepshead", count: 3, length: 12 },
  { date: "2026-05-03", start: "09:50", end: "12:30", spotId: "jetty", tide: "incoming", water: 70, air: 76, windDir: "S", wind: 9, bait: "Sand flea", species: "Black Drum", count: 2, length: 24, weight: 8, notes: "Slow grind on the rocks." },
]);
