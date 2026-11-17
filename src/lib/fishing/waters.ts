/** Named water and Charleston County public landings for a catch coordinate. */

export type PlaceLabel = {
  waterway: string;
  landing: string;
  landingMiles: number;
  landingLat: number;
  landingLng: number;
};

type Waterway = { name: string; points: [number, number][] };

const WATERWAYS: Waterway[] = [
  { name: "Shem Creek", points: [[32.7886, -79.8665], [32.7904, -79.8766], [32.7932, -79.877], [32.7965, -79.885]] },
  { name: "Cove Inlet", points: [[32.7834, -79.8612], [32.786, -79.855], [32.789, -79.848]] },
  { name: "Breach Inlet", points: [[32.7775, -79.815], [32.7748, -79.806], [32.772, -79.8]] },
  { name: "Charleston Harbor", points: [[32.74, -79.86], [32.756, -79.87], [32.77, -79.9], [32.775, -79.92]] },
  { name: "Cooper River", points: [[32.79, -79.925], [32.83, -79.94], [32.87, -79.96], [32.91, -79.96]] },
  { name: "Wando River", points: [[32.8, -79.9], [32.8135, -79.908], [32.86, -79.88], [32.92, -79.84]] },
  { name: "Ashley River", points: [[32.778, -79.955], [32.8, -79.98], [32.837, -80.019], [32.86, -80.04]] },
  { name: "Elliott Cut", points: [[32.769, -79.96], [32.7673, -79.973], [32.766, -79.985]] },
  { name: "Wappoo Creek", points: [[32.768, -79.985], [32.7685, -79.993], [32.766, -80.005]] },
  { name: "Stono River", points: [[32.75, -80.0], [32.7, -80.0], [32.67, -79.995], [32.63, -80.0]] },
  { name: "Folly River", points: [[32.67, -79.93], [32.655, -79.94], [32.645, -79.955]] },
  { name: "Copahee Sound", points: [[32.83, -79.8], [32.85, -79.76], [32.87, -79.73]] },
  { name: "Hobcaw Creek", points: [[32.815, -79.87], [32.822, -79.86], [32.83, -79.85]] },
  { name: "Toomer Creek", points: [[32.805, -79.855], [32.81, -79.845]] },
  { name: "Dawho River", points: [[32.62, -80.26], [32.56, -80.28], [32.54, -80.3]] },
  { name: "Intracoastal Waterway", points: [[32.9, -79.7], [32.9398, -79.6575], [33.0, -79.6], [33.0384, -79.5609]] },
];

/** Charleston County public boat landings. Coordinates are the ramp or its street address. */
const LANDINGS: { name: string; waterway: string; lat: number; lng: number }[] = [
  { name: "Shem Creek", waterway: "Shem Creek", lat: 32.79319, lng: -79.87669 },
  { name: "Remley's Point", waterway: "Wando River", lat: 32.81352, lng: -79.90777 },
  { name: "Wappoo Cut", waterway: "Elliott Cut", lat: 32.76733, lng: -79.97279 },
  { name: "Riverland Terrace", waterway: "Wappoo Creek", lat: 32.76846, lng: -79.99258 },
  { name: "Battery Island (Sol Legare)", waterway: "Stono River", lat: 32.67064, lng: -79.99457 },
  { name: "W.O. Thomas Jr.", waterway: "Ashley River", lat: 32.83752, lng: -80.01924 },
  { name: "Garris Landing", waterway: "Intracoastal Waterway", lat: 32.93981, lng: -79.65748 },
  { name: "Buck Hall", waterway: "Intracoastal Waterway", lat: 33.03836, lng: -79.56089 },
];

export function describePlace(lat: number, lng: number): PlaceLabel {
  const waterway = nearestWaterway(lat, lng);
  const landing = nearestLanding(lat, lng);
  return {
    waterway: waterway.name,
    landing: landing.name,
    landingMiles: landing.miles,
    landingLat: landing.lat,
    landingLng: landing.lng,
  };
}

function nearestWaterway(lat: number, lng: number): { name: string; miles: number } {
  let best = { name: WATERWAYS[0].name, miles: Infinity };
  for (const water of WATERWAYS) {
    const miles = distanceToLine(lat, lng, water.points);
    if (miles < best.miles) best = { name: water.name, miles };
  }
  return best;
}

function nearestLanding(lat: number, lng: number): { name: string; miles: number; lat: number; lng: number } {
  let best = { name: LANDINGS[0].name, miles: Infinity, lat: LANDINGS[0].lat, lng: LANDINGS[0].lng };
  for (const landing of LANDINGS) {
    const miles = milesBetween(lat, lng, landing.lat, landing.lng);
    if (miles < best.miles) best = { name: landing.name, miles, lat: landing.lat, lng: landing.lng };
  }
  return best;
}

function distanceToLine(lat: number, lng: number, points: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    const miles = milesToSegment(lat, lng, points[i], points[i + 1]);
    if (miles < best) best = miles;
  }
  if (points.length === 1) return milesBetween(lat, lng, points[0][0], points[0][1]);
  return best;
}

function milesToSegment(
  lat: number,
  lng: number,
  a: [number, number],
  b: [number, number],
): number {
  const abLat = b[0] - a[0];
  const abLng = b[1] - a[1];
  const length = abLat * abLat + abLng * abLng;
  const t = length === 0 ? 0 : Math.min(1, Math.max(0, ((lat - a[0]) * abLat + (lng - a[1]) * abLng) / length));
  return milesBetween(lat, lng, a[0] + t * abLat, a[1] + t * abLng);
}

function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radius = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}
