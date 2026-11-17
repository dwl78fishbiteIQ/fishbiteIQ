import type { Species } from "@/lib/fishing/types";

/** Typical Charleston harbor water, °F, when the gauge isn't speaking for that day. */
export const WATER_BY_MONTH: Record<number, number> = {
  1: 52,
  2: 53,
  3: 58,
  4: 66,
  5: 74,
  6: 80,
  7: 84,
  8: 84,
  9: 80,
  10: 72,
  11: 64,
  12: 56,
};

export type SeasonBlurb = {
  species: Species;
  /** Months this note applies to. */
  months: number[];
  text: string;
};

/**
 * Personal seasonal notes for the greater Charleston book.
 * Shown with a General badge unless the catch log backs them up.
 */
export const SEASON_NOTES: SeasonBlurb[] = [
  {
    species: "Red Drum",
    months: [9, 10, 11, 12],
    text: "Fall is the red season on these waters. Schools and slot fish sit on oyster and creek mouths on the outgoing. Spoons and paddle tails when they're up; live shrimp when they're not.",
  },
  {
    species: "Red Drum",
    months: [3, 4, 5],
    text: "Spring reds are a moving-tide bite, often a little deeper than the fall flats. Shrimp and mud minnows. Don't expect the tailing shows of October.",
  },
  {
    species: "Red Drum",
    months: [6, 7, 8],
    text: "Summer reds are an early or late bite. Midday slack has been empty in the catch log. Dock lights and the first of a tide are the honest windows.",
  },
  {
    species: "Red Drum",
    months: [1, 2],
    text: "Winter reds get stubborn once the water drops through the low 50s. A slow outgoing on a mild day can still move a fish. If it's blowing and cold, stay home.",
  },
  {
    species: "Spotted Seatrout",
    months: [9, 10, 11],
    text: "The fall trout run is creek mouths and moving water. Live shrimp under a cork at dawn is the pattern, especially at Breach Inlet.",
  },
  {
    species: "Spotted Seatrout",
    months: [5, 6, 7, 8],
    text: "Summer trout are a low-light bite. Dock lights on an outgoing have outfished midday in the catch log.",
  },
  {
    species: "Spotted Seatrout",
    months: [12, 1, 2, 3, 4],
    text: "Trout thin out in the cold. When they show, it's usually a mild afternoon and a slow bait. This is general — the winter catch log here is thin.",
  },
  {
    species: "Flounder",
    months: [5, 6, 7, 8, 9],
    text: "Flounder in the catch log came on the incoming, Carolina-rigged, near mud and structure. The keeper season is often short or closed. Confirm SCDNR before you keep one.",
  },
  {
    species: "Flounder",
    months: [1, 2, 3, 4, 10, 11, 12],
    text: "Don't plan a flounder trip from these notes outside late spring through early fall. If the season is closed, the advice is to let them go. Confirm SCDNR either way.",
  },
  {
    species: "Sheepshead",
    months: [10, 11, 12, 1, 2, 3, 4],
    text: "Cooler water puts sheepshead on docks and jetty rock. Fiddler crabs and oyster crabs, fished tight to the structure on the incoming.",
  },
  {
    species: "Sheepshead",
    months: [5, 6, 7, 8, 9],
    text: "Sheepshead don't vanish in summer, but the catch log doesn't have the trips. Structure and crabs still apply. General, not from the catch log.",
  },
  {
    species: "Black Drum",
    months: [3, 4, 5, 10, 11],
    text: "Black drum show on the same docks and rocks as sheepshead, usually a bit bigger and slower. Crabs. Spring and fall.",
  },
  {
    species: "Black Drum",
    months: [1, 2, 6, 7, 8, 9, 12],
    text: "Outside spring and fall, black drum in the catch log are a maybe. Fish the structure if you're already there for sheepshead. General.",
  },
  {
    species: "Whiting",
    months: [4, 5, 6, 9, 10],
    text: "Whiting are a surf and beach-trough fish, not a creek pattern. The catch log doesn't cover them. General only.",
  },
  {
    species: "Whiting",
    months: [1, 2, 3, 7, 8, 11, 12],
    text: "Not a target in these creeks. If you want whiting, think the beach, and treat this as general.",
  },
];

export function notesForMonth(month: number): SeasonBlurb[] {
  const seen = new Set<Species>();
  const out: SeasonBlurb[] = [];
  for (const note of SEASON_NOTES) {
    if (!note.months.includes(month) || seen.has(note.species)) continue;
    seen.add(note.species);
    out.push(note);
  }
  return out;
}

export function noteFor(species: Species, month: number): string {
  return (
    notesForMonth(month).find((n) => n.species === species)?.text ??
    "No seasonal note for that fish this month. Treat anything I say as general."
  );
}
