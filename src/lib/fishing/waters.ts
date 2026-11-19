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

/** Public boat landings in Charleston, Berkeley, and Dorchester counties. Coordinates are from SCDNR, with Charleston County Park ramps added where that list left them out. */
const LANDINGS: { name: string; waterway: string; lat: number; lng: number }[] = [
  { name: "Shem Creek", waterway: "Shem Creek", lat: 32.7925, lng: -79.87639 },
  { name: "Remley's Point", waterway: "Wando River", lat: 32.81333, lng: -79.90667 },
  { name: "Paradise Landing", waterway: "Wando River", lat: 32.91373, lng: -79.73717 },
  { name: "Gadsdenville", waterway: "Copahee Sound", lat: 32.87468, lng: -79.73898 },
  { name: "Garris Landing", waterway: "Intracoastal Waterway", lat: 32.93995, lng: -79.65745 },
  { name: "Buck Hall", waterway: "Intracoastal Waterway", lat: 33.03875, lng: -79.56095 },
  { name: "Still's", waterway: "Wambaw Creek", lat: 33.17735, lng: -79.4967 },
  { name: "Wappoo Cut", waterway: "Elliott Cut", lat: 32.76743, lng: -79.97283 },
  { name: "Riverland Terrace", waterway: "Wappoo Creek", lat: 32.76828, lng: -79.99248 },
  { name: "Battery Island", waterway: "Stono River", lat: 32.66828, lng: -79.99717 },
  { name: "Folly River", waterway: "Folly River", lat: 32.6601, lng: -79.9434 },
  { name: "John P. Limehouse", waterway: "Stono River", lat: 32.785, lng: -80.10642 },
  { name: "Cherry Point", waterway: "Bohicket Creek", lat: 32.59805, lng: -80.18277 },
  { name: "Bulow", waterway: "Rantowles Creek", lat: 32.81877, lng: -80.14862 },
  { name: "Pierpont", waterway: "Ashley River", lat: 32.83782, lng: -80.0431 },
  { name: "Flynn Street", waterway: "Ashley River", lat: 32.84777, lng: -80.03703 },
  { name: "W.O. Thomas Jr.", waterway: "Ashley River", lat: 32.83621, lng: -80.02131 },
  { name: "Hendricks Landing", waterway: "Cooper River", lat: 32.89115, lng: -79.97088 },
  { name: "Steamboat", waterway: "North Edisto River", lat: 32.60217, lng: -80.29303 },
  { name: "Toogoodoo", waterway: "Toogoodoo Creek", lat: 32.6888, lng: -80.29627 },
  { name: "Dawhoo", waterway: "Dawhoo Creek", lat: 32.63577, lng: -80.34098 },
  { name: "Penny Creek", waterway: "Penny Creek", lat: 32.73488, lng: -80.41042 },
  { name: "Willtown Bluff", waterway: "Edisto River", lat: 32.67878, lng: -80.41618 },
  { name: "Martin's", waterway: "Edisto River", lat: 32.84357, lng: -80.39452 },
  { name: "Live Oak", waterway: "Big Bay Creek", lat: 32.5024, lng: -80.323 },
  { name: "John R. Bettis", waterway: "Goose Creek", lat: 32.93306, lng: -80.0225 },
  { name: "Bushy Park", waterway: "Cooper River", lat: 32.96694, lng: -79.93722 },
  { name: "Bushy Park (Back River)", waterway: "Back River", lat: 32.96778, lng: -79.9375 },
  { name: "Dunham Creek", waterway: "Dunham Creek", lat: 33.05722, lng: -79.9575 },
  { name: "Ralph Hamer Sr.", waterway: "Quenby Creek", lat: 33.09472, lng: -79.80806 },
  { name: "Huger Park", waterway: "Cooper River", lat: 33.13113, lng: -79.81105 },
  { name: "William Dennis", waterway: "Tail Race Canal", lat: 33.21306, lng: -79.97333 },
  { name: "Rembert C. Dennis", waterway: "Wadboo Creek", lat: 33.21318, lng: -79.97328 },
  { name: "Thornley Forest II", waterway: "Lake Moultrie", lat: 33.21875, lng: -80.03 },
  { name: "E. Jarvis Morris", waterway: "Lake Moultrie", lat: 33.21098, lng: -80.04985 },
  { name: "Hatchery Landing", waterway: "Lake Moultrie", lat: 33.26833, lng: -80.10306 },
  { name: "Fred L. Day", waterway: "Lake Moultrie", lat: 33.29556, lng: -80.15639 },
  { name: "Richardson's", waterway: "Lake Moultrie", lat: 33.31111, lng: -79.9975 },
  { name: "Augustus M. Flood", waterway: "Lake Moultrie", lat: 33.31306, lng: -80.0 },
  { name: "Henderson G. Guerry", waterway: "Lake Moultrie", lat: 33.40222, lng: -79.99278 },
  { name: "McConnel's", waterway: "Santee River", lat: 33.245, lng: -79.52111 },
  { name: "Lenud's Landing", waterway: "Santee River", lat: 33.30417, lng: -79.67889 },
  { name: "Tailrace Landing", waterway: "Santee River", lat: 33.40444, lng: -79.86333 },
  { name: "Wilson's Landing", waterway: "Santee River", lat: 33.412, lng: -80.14872 },
  { name: "Spiers", waterway: "Lake Marion", lat: 33.39639, lng: -80.1975 },
  { name: "Herbert H. Jessen", waterway: "Ashley River", lat: 32.9475, lng: -80.165 },
  { name: "Howard Bridgman", waterway: "Ashley River", lat: 32.9585, lng: -80.20053 },
  { name: "T. W. Messervy", waterway: "Edisto River", lat: 33.00028, lng: -80.405 },
  { name: "T. Coke Weeks", waterway: "Edisto River", lat: 33.06472, lng: -80.61306 },
];

export function publicLandings(): { name: string; waterway: string; lat: number; lng: number }[] {
  return LANDINGS;
}

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

/** Short channel links where two plotted waterways meet but the lines do not touch. These follow the water, not a shortcut across land. */
const CONNECTORS: Waterway[] = [
  { name: "Charleston Harbor", points: [[32.7886, -79.8665], [32.778, -79.872], [32.756, -79.87]] },
  { name: "Charleston Harbor", points: [[32.775, -79.92], [32.783, -79.923], [32.79, -79.925]] },
  { name: "Charleston Harbor", points: [[32.77, -79.9], [32.785, -79.9], [32.8, -79.9]] },
  { name: "Charleston Harbor", points: [[32.77, -79.9], [32.774, -79.928], [32.778, -79.955]] },
  { name: "Ashley River", points: [[32.778, -79.955], [32.773, -79.958], [32.769, -79.96]] },
  { name: "Elliott Cut", points: [[32.766, -79.985], [32.768, -79.985]] },
  { name: "Stono River", points: [[32.766, -80.005], [32.758, -80.003], [32.75, -80.0]] },
  { name: "Charleston Harbor", points: [[32.7834, -79.8612], [32.774, -79.86], [32.756, -79.87]] },
  { name: "Wando River", points: [[32.815, -79.87], [32.814, -79.89], [32.8135, -79.908]] },
  { name: "Intracoastal Waterway", points: [[32.87, -79.73], [32.885, -79.715], [32.9, -79.7]] },
  { name: "Charleston Harbor", points: [[32.7775, -79.815], [32.78, -79.838], [32.7834, -79.8612]] },
];

type Pt = [number, number];
type Segment = { name: string; a: Pt; b: Pt; aId: number; bId: number };
type Graph = {
  edges: { to: number; miles: number }[][];
  segments: Segment[];
  landings: { name: string; lat: number; lng: number; node: number; off: number; seg: number; point: Pt }[];
};

let routeGraph: Graph | null = null;

function nearestLanding(lat: number, lng: number): { name: string; miles: number; lat: number; lng: number } {
  const graph = waterGraph();
  const snap = nearestSegment(lat, lng, graph.segments, 4);
  if (!snap) return straightLanding(lat, lng);
  const fromA = routeMiles(graph, snap.seg.aId);
  const fromB = routeMiles(graph, snap.seg.bId);
  let best: { name: string; miles: number; lat: number; lng: number } | null = null;
  for (const landing of graph.landings) {
    const alongEnds = Math.min(snap.toA + fromA[landing.node], snap.toB + fromB[landing.node]);
    const alongSame = snap.seg === graph.segments[landing.seg] ? milesBetween(snap.point[0], snap.point[1], landing.point[0], landing.point[1]) : Infinity;
    const miles = snap.miles + landing.off + Math.min(alongEnds, alongSame);
    if (!Number.isFinite(miles)) continue;
    if (!best || miles < best.miles) best = { name: landing.name, miles, lat: landing.lat, lng: landing.lng };
  }
  return best ?? straightLanding(lat, lng);
}

function straightLanding(lat: number, lng: number): { name: string; miles: number; lat: number; lng: number } {
  let best = { name: LANDINGS[0].name, miles: Infinity, lat: LANDINGS[0].lat, lng: LANDINGS[0].lng };
  for (const landing of LANDINGS) {
    const miles = milesBetween(lat, lng, landing.lat, landing.lng);
    if (miles < best.miles) best = { name: landing.name, miles, lat: landing.lat, lng: landing.lng };
  }
  return best;
}

function waterGraph(): Graph {
  if (routeGraph) return routeGraph;
  const nodes: Pt[] = [];
  const keyToId = new Map<string, number>();
  const edges: { to: number; miles: number }[][] = [];
  const idOf = (point: Pt) => {
    const key = `${point[0].toFixed(4)},${point[1].toFixed(4)}`;
    const found = keyToId.get(key);
    if (found != null) return found;
    const id = nodes.length;
    nodes.push(point);
    keyToId.set(key, id);
    edges[id] = [];
    return id;
  };
  const link = (a: number, b: number) => {
    if (a === b) return;
    const miles = milesBetween(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1]);
    edges[a].push({ to: b, miles });
    edges[b].push({ to: a, miles });
  };
  const segments: Segment[] = [];
  for (const route of [...WATERWAYS, ...CONNECTORS]) {
    let previous = idOf(route.points[0]);
    for (let i = 1; i < route.points.length; i += 1) {
      const next = idOf(route.points[i]);
      link(previous, next);
      segments.push({ name: route.name, a: nodes[previous], b: nodes[next], aId: previous, bId: next });
      previous = next;
    }
  }
  const landings = LANDINGS.flatMap((landing) => {
    const named = segments.filter((segment) => segment.name === landing.waterway);
    const onName = nearestSegment(landing.lat, landing.lng, named, 5);
    const snap = onName ?? nearestSegment(landing.lat, landing.lng, segments, 3);
    if (!snap) return [];
    const node = idOf(snap.point);
    link(node, snap.seg.aId);
    link(node, snap.seg.bId);
    return [{ name: landing.name, lat: landing.lat, lng: landing.lng, node, off: snap.miles, seg: segments.indexOf(snap.seg), point: snap.point }];
  });
  routeGraph = { edges, segments, landings };
  return routeGraph;
}

function nearestSegment(lat: number, lng: number, segments: Segment[], maxMiles: number) {
  let best: { seg: Segment; point: Pt; miles: number; toA: number; toB: number } | null = null;
  for (const seg of segments) {
    const hit = projectToSegment(lat, lng, seg.a, seg.b);
    if (hit.miles > maxMiles) continue;
    if (!best || hit.miles < best.miles) best = { seg, ...hit };
  }
  return best;
}

function projectToSegment(lat: number, lng: number, a: Pt, b: Pt) {
  const abLat = b[0] - a[0];
  const abLng = b[1] - a[1];
  const length = abLat * abLat + abLng * abLng;
  const t = length === 0 ? 0 : Math.min(1, Math.max(0, ((lat - a[0]) * abLat + (lng - a[1]) * abLng) / length));
  const point: Pt = [a[0] + t * abLat, a[1] + t * abLng];
  return {
    point,
    miles: milesBetween(lat, lng, point[0], point[1]),
    toA: milesBetween(point[0], point[1], a[0], a[1]),
    toB: milesBetween(point[0], point[1], b[0], b[1]),
  };
}

function routeMiles(graph: Graph, start: number): number[] {
  const dist = Array(graph.edges.length).fill(Infinity);
  const used = Array(graph.edges.length).fill(false);
  dist[start] = 0;
  for (let step = 0; step < dist.length; step += 1) {
    let node = -1;
    for (let i = 0; i < dist.length; i += 1) {
      if (!used[i] && (node < 0 || dist[i] < dist[node])) node = i;
    }
    if (node < 0 || dist[node] === Infinity) break;
    used[node] = true;
    for (const edge of graph.edges[node] ?? []) {
      const next = dist[node] + edge.miles;
      if (next < dist[edge.to]) dist[edge.to] = next;
    }
  }
  return dist;
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
