import type { Area, Spot } from "@/lib/fishing/types";
import { PUBLIC_MARKS } from "@/lib/fishing/public-structure";

export const SPOTS: Spot[] = [
  {
    id: "shem",
    name: "Shem Creek",
    aliases: ["shem creek", "shem"],
    area: "Mt. Pleasant",
    lat: 32.7904,
    lng: -79.8766,
    depth: "8–20 ft in the channel, less on the bars",
    structure: "Docks, oyster point, creek mouth",
    bestTides: "First of the outgoing",
    offsetMin: 25,
    exposed: false,
    image: "/spots/shem-creek.jpg",
    blurb:
      "The town creek. Reds work the oyster on a falling tide. Trout slide under the docks when the water is moving.",
  },
  {
    id: "pitt",
    name: "Pitt Street Bridge",
    aliases: ["pitt street", "pitt st", "old village"],
    area: "Mt. Pleasant",
    lat: 32.7834,
    lng: -79.8612,
    depth: "6–15 ft along the bridge drop",
    structure: "Bridge pilings, oyster, creek mouth",
    bestTides: "Outgoing, first two hours",
    offsetMin: 15,
    exposed: false,
    blurb:
      "Old Village cut toward Sullivan's. A short outgoing here has been a reliable red tide in the fall.",
  },
  {
    id: "breach",
    name: "Breach Inlet",
    aliases: ["breach inlet", "breach"],
    area: "Barrier Islands",
    lat: 32.7762,
    lng: -79.8108,
    depth: "Deep cut, rocks on the edges",
    structure: "Rocks, hard current, creek mouth",
    bestTides: "Moving water, especially the outgoing",
    offsetMin: 0,
    exposed: false,
    image: "/spots/breach-inlet.jpg",
    blurb:
      "The cut between Sullivan's and Isle of Palms. Trout like a shrimp under a cork on the outgoing. Respect the current.",
  },
  {
    id: "copahee",
    name: "Copahee Sound",
    aliases: ["copahee", "copahee sound"],
    area: "Mt. Pleasant",
    lat: 32.852,
    lng: -79.778,
    depth: "2–6 ft on the flat, deeper in the creek",
    structure: "Oyster flat, marsh, mud",
    bestTides: "Last of the outgoing, skinny water",
    offsetMin: 40,
    exposed: false,
    image: "/spots/copahee.jpg",
    blurb:
      "North of town. Fall reds tail on the oyster when the flat drains. A gold spoon is the pattern here.",
  },
  {
    id: "wappoo",
    name: "Wappoo Cut",
    aliases: ["wappoo", "wappoo cut"],
    area: "West Ashley",
    lat: 32.7658,
    lng: -79.9734,
    depth: "15–30 ft in the cut, docks on the edges",
    structure: "Docks, pilings, hard current",
    bestTides: "Incoming, up toward the high",
    offsetMin: 10,
    exposed: false,
    blurb:
      "A dock-and-current bite. Sheepshead and black drum show up here on fiddlers when the water cools.",
  },
  {
    id: "jetty",
    name: "Harbor jetties",
    aliases: ["jetty", "jetties", "north jetty", "harbor jetty", "charleston jetty"],
    area: "Charleston Harbor",
    lat: 32.7365,
    lng: -79.851,
    depth: "Rocks into deep water",
    structure: "Jetty rocks, barnacles",
    bestTides: "Incoming toward high",
    offsetMin: -15,
    exposed: true,
    image: "/spots/harbor-jetty.jpg",
    blurb:
      "The harbor rocks. Sheepshead country in the cooler months. Stay off them when the swell is up.",
  },
];

export function spotById(id: string): Spot | undefined {
  return SPOTS.find((s) => s.id === id);
}

export function spotsInArea(area: Area | null): Spot[] {
  if (!area) return SPOTS;
  return SPOTS.filter((s) => s.area === area);
}

export function mentionedSpot(text: string): Spot | undefined {
  const hay = text.toLowerCase();
  const aliases = SPOTS.flatMap((s) => s.aliases.map((a) => ({ a, s }))).sort(
    (x, y) => y.a.length - x.a.length,
  );
  return aliases.find((x) => hay.includes(x.a))?.s;
}

export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type NearbySpot = {
  key: string;
  id: string;
  name: string;
  kind: "guide" | "public" | "user";
  feet: number;
};

/** Public guide spots, public flats and reefs, and saved user spots inside the distance. */
export function spotsWithinFeet(
  lat: number,
  lng: number,
  waypoints: { id: string; name: string; lat: number; lng: number }[],
  feet = 100,
): NearbySpot[] {
  const limit = feet / 5280;
  const found: NearbySpot[] = [];
  const add = (id: string, name: string, kind: NearbySpot["kind"], spotLat: number, spotLng: number) => {
    const miles = milesBetween(lat, lng, spotLat, spotLng);
    if (miles > limit) return;
    found.push({ key: `${kind}:${id}`, id, name, kind, feet: Math.max(1, Math.round(miles * 5280)) });
  };
  for (const spot of SPOTS) add(spot.id, spot.name, "guide", spot.lat, spot.lng);
  for (const mark of PUBLIC_MARKS) add(mark.id, mark.name, "public", mark.lat, mark.lng);
  for (const mark of waypoints) add(mark.id, mark.name, "user", mark.lat, mark.lng);
  return found.sort((a, b) => a.feet - b.feet);
}

export type SpotFix = { spot: Spot; miles: number };

export function closestSpots(lat: number, lng: number): SpotFix[] {
  return SPOTS.map((spot) => ({ spot, miles: milesBetween(lat, lng, spot.lat, spot.lng) })).sort(
    (a, b) => a.miles - b.miles,
  );
}

/** A guide spot only when the photo is clearly closer to one of them than the others. */
export function confidentSpot(lat: number, lng: number): SpotFix | null {
  const [first, second] = closestSpots(lat, lng);
  if (!first || first.miles > 2.5) return null;
  const gap = second ? second.miles - first.miles : Number.POSITIVE_INFINITY;
  if (first.miles <= 0.45 || gap >= 0.4) return first;
  return null;
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) {
    const feet = Math.max(1, Math.round(miles * 5280));
    return `${feet} ft`;
  }
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
