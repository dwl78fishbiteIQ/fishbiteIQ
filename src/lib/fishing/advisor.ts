import { moonOn } from "@/lib/fishing/moon";
import { matchingReport, type PublicPulse } from "@/lib/fishing/public-reports";
import { noteFor, notesForMonth } from "@/lib/fishing/seasons";
import { mentionedSpot, spotById, SPOTS } from "@/lib/fishing/spots";
import { rowNear } from "@/lib/fishing/log-filter";
import { hoursAfterTurn, stageFromStation, tidePhrase } from "@/lib/fishing/station";
import { solunarOn } from "@/lib/fishing/solunar";
import { mentionedWaypoint, nearestWaypoint, type Waypoint } from "@/lib/fishing/waypoints";
import { describePlace } from "@/lib/fishing/waters";
import {
  calendarDiff,
  clockToMinutes,
  degToWind,
  formatClock,
  formatLongDate,
  formatPrettyDate,
  formatRange,
  monthOf,
  MONTHS,
  parseClockPhrase,
  parseDatePhrase,
  parseMonthPhrase,
  weatherLabel,
  windClose,
} from "@/lib/fishing/time";
import type {
  Advice,
  Area,
  CatchRow,
  Citation,
  Conditions,
  HourPoint,
  LogFact,
  SeasonNote,
  Species,
  Spot,
  SpotPick,
  TideEvent,
  TideStage,
  WindDir,
} from "@/lib/fishing/types";
import { AREAS, TIDE_STAGES } from "@/lib/fishing/types";

const REMINDERS = [
  "Check current SCDNR size and bag limits before you keep anything. A length guessed from a photo is not a legal measurement.",
  "Check the marine forecast again before you leave the dock. If it turns rough, don't go.",
];

/** A trip has to clear this weather score before it drives the place and the window. */
const STRONG_MATCH = 5;

type FitWeights = {
  windDir: number;
  windSpeed: number;
  water: number;
  air: number;
  pressure: number;
  pressureTrend: number;
  front: number;
  waves: number;
  rain24: number;
  current: number;
  moon: number;
  tide: number;
};

const BASE_WEIGHTS: FitWeights = {
  windDir: 2,
  windSpeed: 2,
  water: 2,
  air: 1,
  pressure: 1,
  pressureTrend: 2,
  front: 2,
  waves: 1,
  rain24: 1,
  current: 1,
  moon: 1,
  tide: 0,
};

function weightsFor(species: Species | "" | null | undefined): FitWeights {
  const weights = { ...BASE_WEIGHTS };
  if (species === "Red Drum" || species === "Flounder") {
    weights.water = 3;
    weights.tide = 2;
  }
  if (species === "Spotted Seatrout") {
    weights.pressureTrend = 3;
    weights.moon = 2;
  }
  return weights;
}

export type Query =
  | {
      kind: "predict";
      date: string;
      species: Species | null;
      area: Area | null;
      spotId: string | null;
      setting: string | null;
      assumedDate: boolean;
      includeBait?: boolean;
    }
  | {
      kind: "when";
      question: string;
      date: string;
      species: Species | null;
      area: Area | null;
      tide: TideStage | null;
      bait: string | null;
      time: string | null;
    }
  | { kind: "log"; tide: TideStage | null; species: Species | null }
  | { kind: "season"; month: number }
  | { kind: "photo" }
  | { kind: "clarify"; missing: Array<"date" | "species">; species: Species | null };

export function whenQuery(question: string, today: string): Extract<Query, { kind: "when" }> {
  return {
    kind: "when",
    question,
    date: parseDatePhrase(question, today) ?? today,
    species: matchSpecies(question),
    area: matchArea(question),
    tide: matchTide(question),
    bait: namedBait(question),
    time: parseClockPhrase(question),
  };
}

export function parseAsk(text: string, today: string): Query {
  const trimmed = text.trim();
  const species = matchSpecies(trimmed);
  const area = matchArea(trimmed);
  const date = parseDatePhrase(trimmed, today);
  const month = parseMonthPhrase(trimmed);
  const spot = mentionedSpot(trimmed);
  const tide = matchTide(trimmed);

  const photo = /\b(photo|picture|image)\b/i.test(trimmed);
  const aboutLog = /\b(catch log|my log|the log|log say)\b/i.test(trimmed);
  const biting = /\bbiting\b/i.test(trimmed);
  const wantsSpot = /\b(best spot|where|when should|time for|worth fishing)\b/i.test(trimmed);
  const tideQuestion =
    tide != null && /\b(tide|tides|do on|history|catch rate)\b/i.test(trimmed) && !wantsSpot;

  if (photo && !wantsSpot) return { kind: "photo" };
  if (photo && wantsSpot && !species) return { kind: "photo" };
  if (aboutLog || tideQuestion) return { kind: "log", tide, species };
  if (biting && !wantsSpot && !species) {
    return { kind: "season", month: month ?? monthOf(today) };
  }

  if (species && date) {
    return {
      kind: "predict",
      date,
      species,
      area,
      spotId: spot?.id ?? null,
      setting: null,
      assumedDate: false,
    };
  }
  if ((wantsSpot || species) && !date) {
    return { kind: "clarify", missing: ["date"], species };
  }
  if (wantsSpot && date && !species) {
    return { kind: "clarify", missing: ["species"], species: null };
  }
  if (date && species) {
    return {
      kind: "predict",
      date,
      species,
      area,
      spotId: spot?.id ?? null,
      setting: null,
      assumedDate: false,
    };
  }
  return { kind: "clarify", missing: ["date", "species"], species };
}

export function advise(
  query: Query,
  rows: CatchRow[],
  conditions: Conditions | null,
  today: string,
  waypoints: Waypoint[] = [],
  pulse: PublicPulse | null = null,
): Advice {
  if (query.kind === "photo") return photoAsk();
  if (query.kind === "clarify") return clarify(query);
  if (query.kind === "season") return seasonReport(query.month, rows);
  if (query.kind === "log") return logReport(query, rows);
  if (query.kind === "when") return answerFromLog(query, rows, conditions, waypoints, pulse);
  return predict(query, rows, conditions, today, waypoints, pulse);
}

function emptyAdvice(partial: Partial<Advice> & Pick<Advice, "mode" | "headline" | "lede">): Advice {
  return {
    confidence: null,
    confidenceWhy: "",
    questions: [],
    safety: null,
    picks: [],
    logFacts: [],
    seasonNotes: [],
    reminders: REMINDERS,
    ...partial,
  };
}

function photoAsk(): Advice {
  return emptyAdvice({
    mode: "photo",
    headline: "I need the picture.",
    lede: "Drop a spot or catch photo below. I'll name what's useful — structure, water, birds, or the fish — then you confirm the details before anything hits the catch log.",
    confidence: null,
    confidenceWhy: "No photo yet, so there's nothing to cite.",
  });
}

function clarify(query: Extract<Query, { kind: "clarify" }>): Advice {
  const fish = query.species;
  const questions: string[] = [];
  if (query.missing.includes("date")) {
    const name = fish ? commonName(fish) : "redfish";
    questions.push(
      `Best spot and time for ${name} today?`,
      `Best spot and time for ${name} tomorrow?`,
      `Best spot and time for ${name} this Saturday?`,
    );
  }
  if (query.missing.includes("species")) {
    questions.push(
      "Best spot and time for redfish this Saturday?",
      "Best spot and time for trout this Saturday?",
      "Best spot and time for sheepshead this Saturday?",
    );
  }
  const missing =
    query.missing.length === 2
      ? "a day and a fish"
      : query.missing[0] === "date"
        ? "which day"
        : "which fish";
  return emptyAdvice({
    mode: "clarify",
    headline: "A couple of details first.",
    lede: `Tell me ${missing}. The area can stay wide — Mt. Pleasant through the harbor is the water this app covers.`,
    questions,
    confidenceWhy: "Not enough to rank a spot yet.",
  });
}

function seasonReport(month: number, rows: CatchRow[]): Advice {
  const name = MONTHS[month - 1] ?? "This month";
  const notes = notesForMonth(month);
  const monthRows = rows.filter((r) => monthOf(r.date) === month);
  const seasonNotes: SeasonNote[] = notes.map((note) => {
    const mine = monthRows.filter((r) => r.species === note.species);
    const kept = mine.filter((r) => r.count > 0);
    const logLine =
      mine.length === 0
        ? null
        : `${mine.length} ${name} trip${mine.length === 1 ? "" : "s"} in the catch log, ${sum(kept.map((r) => r.count))} fish, best ${bestLength(kept)}.`;
    return {
      species: note.species,
      text: note.text,
      badge: logLine ? "Catch log" : "General",
      logLine,
    };
  });
  const backed = seasonNotes.filter((n) => n.badge === "Catch log").length;
  return emptyAdvice({
    mode: "season",
    headline: `${name} in the catch log`,
    lede:
      monthRows.length === 0
        ? `The catch log has no ${name} trips. What follows is seasonal notes, marked General.`
        : `${monthRows.length} trips in ${name} across the years in this catch log. Notes backed by those trips are marked. The rest are general.`,
    confidence: monthRows.length >= 8 ? "high" : monthRows.length >= 3 ? "medium" : "low",
    confidenceWhy:
      monthRows.length === 0
        ? "No catch-log records for this month."
        : `${backed} species have ${name} records. ${monthRows.length} trips total.`,
    seasonNotes,
    logFacts: topMonthFacts(monthRows),
  });
}

function logReport(
  query: Extract<Query, { kind: "log" }>,
  rows: CatchRow[],
): Advice {
  const pool = query.species ? rows.filter((r) => r.species === query.species) : rows;
  const tide = query.tide;
  const focused = tide ? pool.filter((r) => r.tideStage === tide) : pool;
  const facts: LogFact[] = [];

  if (tide) {
    const others = pool.filter((r) => r.tideStage !== tide);
    const avgT = avg(focused.map((r) => r.count));
    const avgO = avg(others.map((r) => r.count));
    facts.push({
      label: `${cap(tide)} trips`,
      detail: `${focused.length} trip${focused.length === 1 ? "" : "s"}, averaging ${avgT.toFixed(1)} fish. Other tides average ${avgO.toFixed(1)} across ${others.length}.`,
      citations: citeRows(bestTrips(focused, 3)),
    });
    const bySpot = groupCount(focused);
    if (bySpot.length) {
      const [id, total] = bySpot[0];
      const spot = spotById(id);
      facts.push({
        label: "Best spot on that tide",
        detail: `${spot?.name ?? id} accounts for ${total} fish on the ${tide} in this filter.`,
        citations: citeRows(focused.filter((r) => r.spotId === id && r.count > 0).slice(0, 3)),
      });
    }
    const baits = topBaits(focused.filter((r) => r.count > 0));
    if (baits) {
      facts.push({
        label: "Baits that produced",
        detail: baits,
        citations: [],
      });
    }
  } else {
    for (const stage of TIDE_STAGES) {
      const slice = pool.filter((r) => r.tideStage === stage);
      if (!slice.length) continue;
      facts.push({
        label: cap(stage),
        detail: `${slice.length} trips, ${avg(slice.map((r) => r.count)).toFixed(1)} fish on average, ${successRate(slice)} with at least one fish.`,
        citations: citeRows(bestTrips(slice, 2)),
      });
    }
  }

  const speciesLine = query.species ? ` for ${query.species}` : "";
  const tideLine = tide ? `${cap(tide).toLowerCase()} tides` : "every tide stage";
  const n = focused.length;
  return emptyAdvice({
    mode: "log",
    headline: tide ? `${cap(tide)} tides in the catch log` : "What the catch log says",
    lede:
      n === 0
        ? `Nothing in the catch log matches ${tideLine}${speciesLine}.`
        : `Looking at ${tideLine}${speciesLine}. ${n} trip${n === 1 ? "" : "s"} in the catch log.`,
    confidence: n >= 8 ? "high" : n >= 3 ? "medium" : "low",
    confidenceWhy:
      n === 0
        ? "No records."
        : n < 3
          ? "Thin. Treat the pattern as a hint, not a rule."
          : `${n} records behind this.`,
    logFacts: facts,
  });
}

function predict(
  query: Extract<Query, { kind: "predict" }>,
  rows: CatchRow[],
  conditions: Conditions | null,
  today: string,
  waypoints: Waypoint[],
  pulse: PublicPulse | null = null,
): Advice {
  const month = monthOf(query.date);
  const species = query.species;
  const forecastWind: WindDir | null = conditions?.daylight.windDir ?? null;
  const waterF = conditions?.waterF ?? null;

  const wave = conditions?.daylight.waveFt ?? null;
  const pattern = logPattern(rows, species);
  const logged = rows.filter((row) => {
    if (species && row.species !== species) return false;
    if (query.area && !rowInArea(row, query.area)) return false;
    return row.count > 0 || Boolean(row.species);
  });
  const scored = clusterRows(logged, waypoints).map((cluster) => {
    const ranked = cluster.rows.map((row) => {
      const weather = meteoFit(row, conditions, null, species, pulse);
      const season = seasonPoints(row.date, query.date);
      const total = weather + recencyPoints(row.date, query.date) + season + patternPoints(row, conditions, query.date, pattern);
      return { row, weather, season, total };
    });
    const similar = ranked.filter((item) => item.weather >= STRONG_MATCH && item.season >= 1);
    const seasonal = ranked.filter((item) => item.season >= 1);
    const pool = (similar.length ? similar : seasonal).map((item) => item.row);
    const stage = pool.length ? bestStage(pool) : ("outgoing" as TideStage);
    const avgCount = pool.length ? avg(pool.map((row) => row.count)) : 0;
    const windAgrees = windAgreement(pool, forecastWind);
    const rankScore = (similar.length ? similar : seasonal).reduce((sum, item) => sum + item.total, 0);
    const guide = spotById(cluster.id);
    const exposed = guide?.exposed ?? false;
    return {
      cluster,
      guide,
      exposed,
      pool,
      similarCount: similar.length,
      seasonalOnly: similar.length === 0 && seasonal.length > 0,
      stage,
      avgCount,
      rankScore,
      windAgrees,
    };
  });

  const open = scored.filter((item) => !(item.exposed && wave != null && wave >= 4));
  const closedBySea = scored.filter((item) => item.exposed && wave != null && wave >= 4);
  open.sort((a, b) => b.rankScore - a.rankScore || b.similarCount - a.similarCount);
  const supported = open.filter((item) => item.pool.length > 0);
  const top = supported.slice(0, 3);

  const dayStop = conditions ? dayIsUnsafe(conditions) : false;
  const forecastGap = !conditions || !conditions.weatherKnown;
  const daysOut = Math.abs(calendarDiff(today, query.date));

  const picks: SpotPick[] = top.map((item, index) => {
    const offset = item.guide?.offsetMin ?? 0;
    const window = describeWindow(offset, item.stage, item.pool, conditions);
    const windowWx = conditions
      ? sliceWeather(conditions.hourly, window.start, window.end)
      : null;
    const windowUnsafe = windowWx ? hourSliceUnsafe(windowWx, item.exposed) : dayStop;
    const deferred = dayStop || windowUnsafe;
    const place = describePlace(item.cluster.lat, item.cluster.lng);
    const reasons = reasonsFor(item, species, waterF, conditions);
    const citations: Citation[] = [
      ...citeRows(bestTrips(item.pool, 3)),
      ...(item.similarCount < 2 && species
        ? [{ id: "", doc: "Seasonal notes" as const, label: noteFor(species, month) }]
        : []),
    ];
    const bait = topBaits(item.pool);
    return {
      rank: index + 1,
      spotId: item.cluster.id,
      place: item.cluster.name,
      lat: item.cluster.lat,
      lng: item.cluster.lng,
      waterway: place.waterway,
      landing: `${place.landing} · ${place.directions}`,
      landingLat: place.landingLat,
      landingLng: place.landingLng,
      why: whyThisSpot(item.pool, item.stage, bait, item.similarCount >= 1 ? 5 : 2, conditions),
      windowLabel: deferred ? `Pattern: ${window.pattern}` : window.label,
      tideStage: item.stage,
      reasons,
      citations,
      deferred,
    };
  });

  const best = top[0];
  const similarN = best?.similarCount ?? 0;
  let confidence: Advice["confidence"] =
    similarN >= 5 ? "high" : similarN >= 2 ? "medium" : "low";
  if (best && !best.windAgrees && confidence === "high") confidence = "medium";
  if (!species) confidence = "low";
  if (forecastGap && daysOut > 7 && confidence === "high") confidence = "medium";

  const dateLabel = formatLongDate(query.date);
  const fishLabel = species ? commonName(species) : "whatever the catch log supports";
  const seaNote =
    closedBySea.length > 0
      ? `${closedBySea.map((item) => item.cluster.name).join(" and ")} ${closedBySea.length === 1 ? "is" : "are"} off the list — seas about ${wave?.toFixed(1)} ft.`
      : null;

  const safetyBits: string[] = [];
  if (dayStop && conditions) {
    safetyBits.push(unsafeSentence(conditions));
  } else if (conditions && conditions.daylight.windHigh != null && conditions.daylight.windHigh >= 16) {
    safetyBits.push(
      `Wind ${conditions.daylight.windLow ?? "?"}\u2013${Math.round(conditions.daylight.windHigh)} mph. Fishable in the creeks, sloppy on the rocks. Don't stretch it.`,
    );
  }
  if (seaNote) safetyBits.push(seaNote);
  if (forecastGap) {
    safetyBits.push(
      daysOut > 6
        ? "No weather forecast that far out. These windows are the tide clock and the catch log only. Check the marine forecast the day before."
        : "I couldn't read the weather just now. Don't treat this as a go-ahead.",
    );
  }
  if (conditions?.waterSource === "seasonal") {
    safetyBits.push(
      `Water temperature is a typical ${MONTHS[month - 1]} figure (${conditions.waterF}°F).`,
    );
  }

  const thin = similarN < 2;
  const ledeParts: string[] = [];
  if (query.spotId && best && best.cluster.id !== query.spotId) {
    const named = spotById(query.spotId);
    ledeParts.push(
      `${named?.name ?? "That spot"} is not the strongest match in the catch log. The better-supported place is listed first.`,
    );
  }
  if (!best) {
    ledeParts.push(
      closedBySea.length
        ? "Every logged place that fits this ask is exposed, and the seas are too big to send you there."
        : `Nothing in the catch log matches ${fishLabel} for this season and forecast. A general ${MONTHS[month - 1]} note is not a place to go.`,
    );
  } else if (dayStop) {
    ledeParts.push(
      `Don't launch ${formatPrettyDate(query.date)}. The pattern below is for a calmer day — it is not a time to go.`,
    );
  } else if (best && species) {
    ledeParts.push(
      thin
        ? `The catch log has no ${fishLabel} trip from this season in weather like ${formatPrettyDate(query.date)}. I'm not filling that in with a general tip.`
        : `${best.cluster.name} is the best match in the catch log for ${fishLabel} on ${formatPrettyDate(query.date)}${
            best.seasonalOnly ? ", from the same season, though the weather was not this close" : ""
          }.`,
    );
  } else {
    ledeParts.push("No species was named, so this is a general read of the catch log for that date.");
  }
  if (query.assumedDate) ledeParts.push("I used today because no day was named.");
  if (conditions) {
    const clock = conditions.tides
      .filter((event) => event.at >= 0 && event.at < 1440)
      .slice(0, 4)
      .map((event) => `${event.type === "H" ? "high" : "low"} ${formatClock(event.at)}`)
      .join(", ");
    const wind =
      conditions.daylight.windDir && conditions.daylight.windHigh != null
        ? `${conditions.daylight.windDir} ${conditions.daylight.windLow ?? "–"}–${Math.round(conditions.daylight.windHigh)} mph`
        : "wind not in yet";
    ledeParts.push(
      `Upcoming tide: ${clock || "not in yet"}. ${conditions.daylight.weatherLabel}, ${wind}, water ${conditions.waterF}°F. The log is scored on season, how recent the trip is, tide, current, wind, water, air, humidity, pressure, clouds, rain, the last 24 hours of rain, front timing, waves, moon, and length when a trip recorded them.`,
    );
  }
  if (query.includeBait) {
    const bait = baitFromLog(rows, species);
    if (bait) ledeParts.push(bait);
  }

  const why = !best
    ? "No spots to score."
    : similarN === 0
      ? "No catch-log trip from this season looked like this day's weather."
      : `${similarN} similar trip${similarN === 1 ? "" : "s"} at the top place, weighted toward recent catches in this season. ${
          best.windAgrees ? "Wind is in the family of those trips." : "Wind does not match most of those trips, so I knocked the confidence down."
        }`;

  return emptyAdvice({
    mode: dayStop ? "unsafe" : "predict",
    headline: dayStop
      ? `Stay ashore ${formatPrettyDate(query.date)}.`
      : `${cap(fishLabel)} · ${dateLabel}`,
    lede: ledeParts.join(" "),
    confidence: dayStop ? "low" : confidence,
    confidenceWhy: why,
    safety: safetyBits.length ? safetyBits.join(" ") : null,
    picks,
    seasonNotes:
      thin && species
        ? [
            {
              species,
              text: noteFor(species, month),
              badge: "General",
              logLine: null,
            },
          ]
        : [],
  });
}

function answerFromLog(
  query: Extract<Query, { kind: "when" }>,
  rows: CatchRow[],
  conditions: Conditions | null,
  waypoints: Waypoint[],
  pulse: PublicPulse | null = null,
): Advice {
  const question = query.question;
  const asksWhere = /\b(where|place|spot|location)\b/i.test(question);
  const asksWhen = /\b(when|time|hour|morning|afternoon|evening|dawn)\b/i.test(question);
  const asksBait = /\b(bait|lure)\b/i.test(question);
  const wantsAll = !asksWhere && !asksWhen && !asksBait;
  let pool = rows.filter((row) => row.count > 0 || row.species || row.lat != null);
  const notes: string[] = [];
  const askedMinutes = query.time ? clockToMinutes(query.time) : null;
  const asked = `You asked about ${query.species ? commonName(query.species) : "any fish in the catch log"}${
    askedMinutes != null ? ` around ${formatClock(askedMinutes)}` : partOfDay(question) ? ` in the ${partOfDay(question)}` : ""
  } on ${formatLongDate(query.date)}${query.tide ? `, ${query.tide} tide` : ""}${query.bait ? `, using ${query.bait}` : ""}.`;

  if (query.species) {
    const named = pool.filter((row) => row.species === query.species);
    if (!named.length) {
      return emptyAdvice({
        mode: "log",
        headline: `${cap(commonName(query.species))} · ${formatLongDate(query.date)}`,
        lede: `${asked} None of the trips are marked ${commonName(query.species)}, so I won't guess a place from trips that don't name the fish.`,
        confidence: "low",
        confidenceWhy: `${rows.length} trips in the catch log, none labeled ${query.species}.`,
      });
    }
    pool = named;
  }
  if (query.bait) {
    const onBait = pool.filter((row) => row.bait.toLowerCase().includes(query.bait!.toLowerCase()));
    if (!onBait.length) {
      notes.push(`No trip lists ${query.bait}.`);
    } else {
      pool = onBait;
    }
  }
  if (query.tide) {
    const onTide = pool.filter((row) => row.tideStage === query.tide);
    if (onTide.length) pool = onTide;
    else notes.push(`No trip is marked ${query.tide}.`);
  }
  if (query.area) {
    const inArea = pool.filter((row) => rowInArea(row, query.area!));
    if (inArea.length) pool = inArea;
    else notes.push(`No logged trip sits in ${query.area}.`);
  }
  const namedPlace = mentionedWaypoint(question, waypoints);
  if (namedPlace) {
    const near = pool.filter((row) => rowNear(row, namedPlace.lat, namedPlace.lng, 0.75));
    if (near.length) pool = near;
    else notes.push(`No logged trip is within a mile of ${namedPlace.name}.`);
  }
  const month = parseMonthPhrase(question);
  if (month) {
    const inMonth = pool.filter((row) => monthOf(row.date) === month);
    if (inMonth.length) pool = inMonth;
  }
  const part = partOfDay(question);
  if (part) {
    const timed = pool.filter((row) => {
      const minutes = clockToMinutes(row.startTime);
      if (minutes == null) return false;
      if (part === "morning") return minutes < 11 * 60;
      if (part === "afternoon") return minutes >= 11 * 60 && minutes < 16 * 60;
      return minutes >= 16 * 60;
    });
    if (timed.length) pool = timed;
  }
  if (askedMinutes != null && conditions) {
    const askedTurn = hoursAfterTurn(conditions.tides, askedMinutes);
    const stageAtAsk = stageFromStation(conditions.tides, askedMinutes);
    if (askedTurn) {
      const onTurn = pool.filter(
        (row) =>
          row.tideTurn === askedTurn.turn &&
          row.tideHours != null &&
          Math.abs(row.tideHours - askedTurn.hours) <= 1,
      );
      if (onTurn.length) pool = onTurn;
      else if (stageAtAsk) {
        const onStage = pool.filter((row) => row.tideStage === stageAtAsk);
        if (onStage.length) {
          pool = onStage;
          notes.push(
            `No trip is logged ${offsetPhrase(askedTurn)}. Using the ${stageAtAsk} tide instead of the clock.`,
          );
        } else notes.push(`No trip matches the tide at ${formatClock(askedMinutes)}.`);
      }
    }
  }

  if (!pool.length) {
    return emptyAdvice({
      mode: "log",
      headline: "Nothing in the catch log matches.",
      lede: "No trip fits that question. Log a few catches and ask again.",
      confidence: "low",
      confidenceWhy: "The catch log has no matching rows.",
    });
  }

  const pattern = logPattern(rows, query.species);
  const askedTurn = askedMinutes != null && conditions ? hoursAfterTurn(conditions.tides, askedMinutes) : null;
  const scored = pool.map((row) => {
    const weather = meteoFit(row, conditions, askedMinutes, query.species, pulse);
    const context = recencyPoints(row.date, query.date) + seasonPoints(row.date, query.date) + patternPoints(row, conditions, query.date, pattern);
    return { row, weather, total: weather + context };
  });
  const fitById = new Map(scored.map((item) => [item.row.id, item]));
  const strong = scored.filter((item) => item.weather >= STRONG_MATCH);
  const matched = (strong.length ? strong : scored).map((item) => item.row);
  const clusters = clusterRows(matched, waypoints)
    .sort((a, b) => {
      const lean = avg(b.rows.map((row) => fitById.get(row.id)?.total ?? 0)) - avg(a.rows.map((row) => fitById.get(row.id)?.total ?? 0));
      if (Math.abs(lean) > 0.25) return lean;
      return b.rows.length - a.rows.length || sum(b.rows.map((row) => row.count)) - sum(a.rows.map((row) => row.count));
    })
    .slice(0, 3);
  const when = timeSpan(matched);
  const bait = topBaits(matched);
  const top = clusters[0];
  const stage = top ? bestStage(top.rows) : bestStage(matched);
  const turnTarget = askedTurn ?? typicalTurn(top?.rows ?? matched);
  const tideWindow = conditions ? tideWindowFor(stage, conditions.tides, matched, askedMinutes, turnTarget) : null;
  const skunk = clusterRows(
    scored.filter((item) => item.row.count === 0 && item.weather >= STRONG_MATCH).map((item) => item.row),
    waypoints,
  ).find((cluster) => cluster.id !== top?.id);
  const unsafe = conditions ? dayIsUnsafe(conditions) : false;
  const sentences: string[] = [];
  const whenBit = tideWindow
    ? `${formatClock(tideWindow.start)}–${formatClock(tideWindow.end)}`
    : when;
  const baitBit = (asksBait || wantsAll) && bait ? ` on ${bait}` : "";
  if ((asksWhere || wantsAll) && top) {
    sentences.push(`${top.name}${whenBit ? `, ${whenBit}` : ""}${baitBit}.`);
  } else if (whenBit && (asksWhen || wantsAll)) {
    sentences.push(`${whenBit}${baitBit}.`);
  } else if (baitBit) {
    sentences.push(`${bait ?? "No bait noted"}.`);
  }
  if (skunk) sentences.push(`You blanked at ${skunk.name} in weather like this.`);
  if (unsafe && conditions) sentences.push(unsafeSentence(conditions));
  if (notes.length) sentences.push(notes.join(" "));

  const picks: SpotPick[] = clusters.map((cluster, index) => {
    const span = timeSpan(cluster.rows);
    const clusterBait = topBaits(cluster.rows);
    const place = describePlace(cluster.lat, cluster.lng);
    const clusterStage = bestStage(cluster.rows);
    const clusterTurn = askedTurn ?? typicalTurn(cluster.rows);
    const window =
      (conditions ? tideWindowFor(clusterStage, conditions.tides, cluster.rows, askedMinutes, clusterTurn) : null) ??
      threeHoursAround(cluster.rows, askedMinutes);
    const avgFit = avg(cluster.rows.map((row) => fitById.get(row.id)?.weather ?? 0));
    const why = whyThisSpot(cluster.rows, clusterStage, clusterBait, avgFit, conditions);
    return {
      rank: index + 1,
      spotId: cluster.id,
      place: cluster.name,
      lat: cluster.lat,
      lng: cluster.lng,
      waterway: place.waterway,
      landing: `${place.landing} · ${place.landingMiles.toFixed(1)} mi by water`,
      landingLat: place.landingLat,
      landingLng: place.landingLng,
      why,
      windowLabel: window
        ? `${formatClock(window.start)}–${formatClock(window.end)} · 3 hours · ${clusterTurn ? offsetPhrase(clusterTurn) : clusterStage}`
        : span ?? "No time on these trips",
      tideStage: clusterStage,
      reasons: [],
      citations: citeRows(bestTrips(cluster.rows, 3)),
      deferred: unsafe,
    };
  });

  const confidence: Advice["confidence"] = unsafe
    ? "low"
    : strong.length >= 6
      ? "high"
      : strong.length >= 2
        ? "medium"
        : "low";
  const fish = query.species ? commonName(query.species) : null;
  return emptyAdvice({
    mode: unsafe ? "unsafe" : "log",
    headline: unsafe
      ? `Stay ashore ${formatPrettyDate(query.date)}.`
      : fish
        ? `${cap(fish)} · ${formatLongDate(query.date)}`
        : `From the catch log · ${formatPrettyDate(query.date)}`,
    lede: sentences.join(" "),
    confidence,
    confidenceWhy: !conditions
      ? "Catch log only."
      : strong.length
        ? `${strong.length} ${strong.length === 1 ? "catch matches" : "catches match"} this weather.`
        : "No catch is close to this weather. Weak lean.",
    picks: asksBait && !asksWhere ? [] : picks,
    safety: unsafe && conditions ? unsafeSentence(conditions) : null,
    logFacts: asksBait && !asksWhere
      ? [
          {
            label: "Bait",
            detail: bait ?? "No bait is written down.",
            citations: citeRows(bestTrips(matched, 3)),
          },
        ]
      : [],
  });
}

export type BiteOutlook = {
  date: string;
  grade: "Hot" | "Good" | "Fair" | "Slow" | "Stay ashore";
  summary: string;
  window: string | null;
};

/** How the catch log lines up with one day's tide and forecast. */
export function biteOutlook(rows: CatchRow[], conditions: Conditions | null, date: string): BiteOutlook {
  if (!conditions) {
    return { date, grade: "Fair", summary: "The forecast isn't in for this day.", window: null };
  }
  if (dayIsUnsafe(conditions)) {
    return { date, grade: "Stay ashore", summary: unsafeSentence(conditions), window: null };
  }
  const producers = rows.filter((row) => row.count > 0);
  if (!producers.length) {
    return { date, grade: "Fair", summary: "No catches in the catch log yet, so this is only the weather.", window: null };
  }
  const pattern = logPattern(rows, null);
  const scored = producers.map((row) => {
    const weather = meteoFit(row, conditions, null, row.species);
    const total = weather + recencyPoints(row.date, date) + seasonPoints(row.date, date) + patternPoints(row, conditions, date, pattern);
    return { row, weather, total };
  });
  const strong = scored.filter((item) => item.weather >= STRONG_MATCH).sort((a, b) => b.total - a.total);
  const pool = (strong.length ? strong : [...scored].sort((a, b) => b.total - a.total)).slice(0, 12);
  const best = pool.map((item) => item.row);
  const stage = bestStage(best);
  const turn = typicalTurn(best);
  const window = tideWindowFor(stage, conditions.tides, best, null, turn);
  const close = strong.length;
  const avgWeather = pool.length ? avg(pool.map((item) => item.weather)) : 0;
  const grade: BiteOutlook["grade"] =
    close >= 4 && avgWeather >= 5 ? "Hot" : close >= 2 ? "Good" : close >= 1 || avgWeather >= 3 ? "Fair" : "Slow";
  const recent = pool.find((item) => recencyPoints(item.row.date, date) >= 2);
  const season = seasonOf(monthOf(date));
  const tideBit = turn ? offsetPhrase(turn) : `the ${stage} tide`;
  const summary = close
    ? `${close} ${season} trip${close === 1 ? "" : "s"} in the catch log look like this wind, water, pressure, and tide, mostly ${tideBit}${
        recent ? `, including ${formatPrettyDate(recent.row.date)}` : ""
      }.`
    : `No ${season} catch in the log looks like this wind, water, tide, and pressure.`;
  return {
    date,
    grade,
    summary,
    window: window ? `${formatClock(window.start)}–${formatClock(window.end)}` : null,
  };
}

function whyThisSpot(
  rows: CatchRow[],
  stage: TideStage,
  bait: string | null,
  fit: number,
  conditions: Conditions | null,
): string {
  const species = [...new Set(rows.map((row) => row.species).filter(Boolean))].map((name) => commonName(name));
  const fish = species.length ? species.join(" and ") : "fish";
  const match = !conditions
    ? "Catch log only."
    : fit >= STRONG_MATCH
      ? "Weather matches."
      : "Weather is a loose match.";
  return `${rows.length} ${fish} here on the ${stage}${bait ? `, mostly ${bait}` : ""}. ${match}`;
}

function meteoFit(
  row: CatchRow,
  conditions: Conditions | null,
  askedMinutes: number | null,
  species: Species | "" | null = null,
  pulse: PublicPulse | null = null,
): number {
  if (!conditions) return 0;
  const weights = weightsFor(species || row.species);
  const minute = askedMinutes ?? clockToMinutes(row.startTime);
  const hour = minute == null ? null : pointAt(conditions, minute);
  let score = 0;

  const wind = row.windDir || row.meteo?.windDir || "";
  const forecastDir =
    hour?.windDeg == null ? conditions.daylight.windDir : (degToWind(hour.windDeg) as WindDir);
  if (forecastDir && windClose(wind, forecastDir)) score += weights.windDir;

  const rowWind = row.windMph ?? row.meteo?.windMph ?? null;
  const forecastWind =
    hour?.windMph ??
    (conditions.daylight.windLow != null && conditions.daylight.windHigh != null
      ? (conditions.daylight.windLow + conditions.daylight.windHigh) / 2
      : conditions.daylight.windHigh);
  if (rowWind != null && forecastWind != null && Math.abs(rowWind - forecastWind) <= 8) score += weights.windSpeed;

  const rowWater = row.waterTempF ?? row.meteo?.waterF ?? null;
  if (rowWater != null && Math.abs(rowWater - conditions.waterF) <= 6) score += weights.water;

  const rowAir = row.airTempF ?? row.meteo?.airF ?? null;
  const forecastAir = hour?.airF ?? dayAir(conditions);
  if (rowAir != null && forecastAir != null && Math.abs(rowAir - forecastAir) <= 8) score += weights.air;

  const rowPressure = row.meteo?.pressureHpa ?? null;
  if (rowPressure != null && conditions.pressureHpa != null && Math.abs(rowPressure - conditions.pressureHpa) <= 6) {
    score += weights.pressure;
  }
  if (row.meteo?.pressureTrend && conditions.pressureTrend && row.meteo.pressureTrend === conditions.pressureTrend) {
    score += weights.pressureTrend;
  }

  const rowWave = row.meteo?.waveFt ?? null;
  const forecastWave = hour?.waveFt ?? conditions.daylight.waveFt;
  if (rowWave != null && forecastWave != null && Math.abs(rowWave - forecastWave) <= 1.5) score += weights.waves;

  const rowRain = row.meteo?.precip24In ?? null;
  if (rowRain != null && conditions.precip24In != null && closeAmount(rowRain, conditions.precip24In, 0.2)) {
    score += weights.rain24;
  }

  const rowFront = row.meteo?.frontHours ?? null;
  if (
    rowFront != null &&
    conditions.frontHours != null &&
    sameSide(rowFront, conditions.frontHours) &&
    Math.abs(rowFront - conditions.frontHours) <= 12
  ) {
    score += weights.front;
  }

  const rowCurrent = row.meteo?.currentKt ?? null;
  const minuteNow = minute ?? 12 * 60;
  const stage = stageFromStation(conditions.tides, minuteNow);
  if (rowCurrent != null && stage && currentAgrees(rowCurrent, stage)) score += weights.current;
  if (weights.tide && stage && row.tideStage === stage) score += weights.tide;

  if (moonOn(row.date).bucket === moonOn(conditions.date).bucket) score += weights.moon;

  const report = matchingReport(pulse, conditions);
  if (report?.tideStage && row.tideStage === report.tideStage) score += 1;
  return score;
}

function closeAmount(logged: number, forecast: number, span: number): boolean {
  return Math.abs(logged - forecast) <= span || (logged < 0.05 && forecast < 0.05);
}

function sameSide(logged: number, forecast: number): boolean {
  if (logged === 0 || forecast === 0) return true;
  return Math.sign(logged) === Math.sign(forecast);
}

function currentAgrees(knots: number, stage: TideStage): boolean {
  const moving = stage === "incoming" || stage === "outgoing";
  return knots >= 0.4 ? moving : !moving;
}

function dayAir(conditions: Conditions): number | null {
  if (conditions.daylight.airLow != null && conditions.daylight.airHigh != null) {
    return (conditions.daylight.airLow + conditions.daylight.airHigh) / 2;
  }
  return conditions.daylight.airHigh;
}

function pointAt(conditions: Conditions, minutes: number): HourPoint | null {
  if (!conditions.hourly.length) return null;
  const hour = Math.floor(minutes / 60) * 60;
  return conditions.hourly.reduce((best, point) =>
    Math.abs(point.at - hour) < Math.abs(best.at - hour) ? point : best,
  );
}

function recencyPoints(rowDate: string, target: string): number {
  const days = Math.abs(calendarDiff(rowDate, target));
  if (days <= 21) return 3;
  if (days <= 60) return 2;
  if (days <= 150) return 1;
  return 0;
}

function seasonPoints(rowDate: string, target: string): number {
  const dist = monthDist(monthOf(rowDate), monthOf(target));
  if (dist === 0) return 3;
  if (dist === 1) return 2;
  if (seasonOf(monthOf(rowDate)) === seasonOf(monthOf(target))) return 1;
  return -1;
}

type LogPattern = { trend: "" | "rising" | "falling" | "stable"; moon: string };

function logPattern(rows: CatchRow[], species: Species | null): LogPattern {
  const named = species ? rows.filter((row) => row.species === species) : rows;
  const trends = new Map<string, { fish: number; trips: number }>();
  const moons = new Map<string, { fish: number; trips: number }>();
  for (const row of named) {
    addRate(trends, row.meteo?.pressureTrend || "", row.count);
    addRate(moons, moonOn(row.date).name, row.count);
  }
  const trend = bestRate(trends);
  return {
    trend: trend === "rising" || trend === "falling" || trend === "stable" ? trend : "",
    moon: bestRate(moons),
  };
}

function addRate(groups: Map<string, { fish: number; trips: number }>, key: string, fish: number) {
  if (!key) return;
  const current = groups.get(key) ?? { fish: 0, trips: 0 };
  current.fish += fish;
  current.trips += 1;
  groups.set(key, current);
}

function bestRate(groups: Map<string, { fish: number; trips: number }>): string {
  const ranked = [...groups.entries()]
    .filter(([, stats]) => stats.trips >= 2)
    .map(([name, stats]) => ({ name, rate: stats.fish / stats.trips }))
    .sort((a, b) => b.rate - a.rate);
  if (!ranked.length) return "";
  if (ranked.length > 1 && ranked[0].rate < ranked[1].rate * 1.25) return "";
  return ranked[0].name;
}

function patternPoints(
  row: CatchRow,
  conditions: Conditions | null,
  date: string,
  pattern: LogPattern,
): number {
  let score = 0;
  if (pattern.trend && conditions?.pressureTrend === pattern.trend && row.meteo?.pressureTrend === pattern.trend) {
    score += 2;
  }
  if (pattern.moon && moonOn(date).name === pattern.moon && moonOn(row.date).name === pattern.moon) score += 2;
  return score;
}

function typicalTurn(rows: CatchRow[]): { hours: number; turn: "high" | "low" } | null {
  const known = rows.filter(
    (row): row is CatchRow & { tideHours: number; tideTurn: "high" | "low" } =>
      row.tideHours != null && (row.tideTurn === "high" || row.tideTurn === "low"),
  );
  if (!known.length) return null;
  const highs = known.filter((row) => row.tideTurn === "high");
  const use = highs.length >= known.length - highs.length ? highs : known.filter((row) => row.tideTurn === "low");
  const hours = use.map((row) => row.tideHours).sort((a, b) => a - b);
  const mid = hours[Math.floor(hours.length / 2)];
  return { hours: mid, turn: use[0].tideTurn };
}

function offsetPhrase(turn: { hours: number; turn: "high" | "low" }): string {
  if (turn.hours === 0) return `on the ${turn.turn}`;
  const hours = Math.abs(turn.hours);
  const unit = hours === 1 ? "hour" : "hours";
  const when = turn.hours > 0 ? "after" : "before";
  return `${hours} ${unit} ${when} the ${turn.turn}`;
}

function forecastSentence(conditions: Conditions, moonName: string): string {
  const wind =
    conditions.daylight.windDir && conditions.daylight.windHigh != null
      ? `${conditions.daylight.windDir} ${conditions.daylight.windLow ?? "–"}–${Math.round(conditions.daylight.windHigh)} mph`
      : "wind not in yet";
  const gust = conditions.gustMph != null ? `, gusts near ${Math.round(conditions.gustMph)}` : "";
  const pressure =
    conditions.pressureHpa != null
      ? `pressure ${(conditions.pressureHpa * 0.02953).toFixed(2)} inHg${conditions.pressureTrend ? ` and ${conditions.pressureTrend}` : ""}`
      : "pressure not in yet";
  const clouds = conditions.cloudPct != null ? `${Math.round(conditions.cloudPct)}% cloud` : null;
  const waves = conditions.daylight.waveFt != null ? `seas ${conditions.daylight.waveFt.toFixed(1)} ft` : null;
  const bits = [
    conditions.daylight.weatherLabel,
    wind + gust,
    `air ${conditions.daylight.airLow ?? "?"}–${conditions.daylight.airHigh ?? "?"}°F`,
    `water ${conditions.waterF}°F`,
    pressure,
    clouds,
    waves,
    moonName.toLowerCase(),
  ].filter(Boolean);
  return `Forecast for that day: ${bits.join(", ")}.`;
}

function tideWindowFor(
  stage: TideStage,
  tides: TideEvent[],
  rows: CatchRow[],
  askedMinutes: number | null = null,
  askedTurn: { hours: number; turn: "high" | "low" } | null = null,
): { start: number; end: number } | null {
  const events = tides.filter((event) => event.at > -360 && event.at < 1440 + 360);
  if (askedTurn) {
    const type = askedTurn.turn === "high" ? "H" : "L";
    const centers = events
      .filter((event) => event.type === type)
      .map((event) => event.at + askedTurn.hours * 60)
      .filter((at) => at > 4 * 60 && at < 22 * 60);
    if (centers.length) {
      const target = askedMinutes ?? 8 * 60;
      centers.sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
      return threeHours(centers[0]);
    }
  }
  const windows: { start: number; end: number }[] = [];
  for (let i = 0; i < events.length - 1; i += 1) {
    const a = events[i];
    const b = events[i + 1];
    if (stage === "outgoing" && a.type === "H" && b.type === "L") windows.push({ start: a.at, end: b.at });
    if (stage === "incoming" && a.type === "L" && b.type === "H") windows.push({ start: a.at, end: b.at });
  }
  if (stage === "high slack" || stage === "low slack") {
    const type = stage === "high slack" ? "H" : "L";
    for (const event of events) {
      if (event.type === type) windows.push({ start: event.at - 40, end: event.at + 40 });
    }
  }
  const open = windows.filter((window) => window.end > 5 * 60 && window.start < 21 * 60);
  if (!open.length) return null;
  const minutes = rows
    .map((row) => clockToMinutes(row.startTime))
    .filter((value): value is number => value != null);
  const target = askedMinutes ?? (minutes.length ? minutes[Math.floor(minutes.length / 2)] : 8 * 60);
  open.sort(
    (a, b) => Math.abs((a.start + a.end) / 2 - target) - Math.abs((b.start + b.end) / 2 - target),
  );
  const pick = open[0];
  const mid = (pick.start + pick.end) / 2;
  const caught = askedMinutes ?? (minutes.length ? minutes[Math.floor(minutes.length / 2)] : mid);
  const center = caught >= pick.start && caught <= pick.end ? caught : mid;
  return threeHours(center);
}

function threeHours(center: number): { start: number; end: number } {
  let start = Math.round(center) - 90;
  let end = start + 180;
  if (start < 0) {
    start = 0;
    end = 180;
  }
  if (end > 1440) {
    end = 1440;
    start = 1260;
  }
  return { start, end };
}

function threeHoursAround(rows: CatchRow[], askedMinutes: number | null): { start: number; end: number } | null {
  const minutes = rows
    .map((row) => clockToMinutes(row.startTime))
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  const center = askedMinutes ?? (minutes.length ? minutes[Math.floor(minutes.length / 2)] : null);
  if (center == null) return null;
  return threeHours(center);
}

function rowInArea(row: CatchRow, area: Area): boolean {
  const spot = spotById(row.spotId);
  if (spot) return spot.area === area;
  if (row.lat == null || row.lng == null) return false;
  const boxes: Record<Area, [number, number, number, number]> = {
    "Mt. Pleasant": [32.74, 32.95, -79.98, -79.72],
    "Charleston Harbor": [32.72, 32.8, -79.97, -79.84],
    "Barrier Islands": [32.55, 32.78, -80.1, -79.7],
    "West Ashley": [32.7, 32.86, -80.12, -79.94],
  };
  const [south, north, west, east] = boxes[area];
  return row.lat >= south && row.lat <= north && row.lng >= west && row.lng <= east;
}

function partOfDay(text: string): "morning" | "afternoon" | "evening" | null {
  if (/\b(morning|dawn)\b/i.test(text)) return "morning";
  if (/\b(afternoon|midday)\b/i.test(text)) return "afternoon";
  if (/\b(evening|night|sunset)\b/i.test(text)) return "evening";
  return null;
}

function namedBait(text: string): string | null {
  const pairs: Array<[RegExp, string]> = [
    [/finger mullet|\bmullet\b/i, "Finger mullet"],
    [/mud minnow|\bminnow\b/i, "Mud minnow"],
    [/live shrimp|\bshrimp\b/i, "shrimp"],
    [/gulp/i, "Gulp"],
    [/paddle tail/i, "Paddle tail"],
    [/gold spoon|\bspoon\b/i, "Gold spoon"],
    [/popping cork|\bcork\b/i, "cork"],
    [/fiddler/i, "Fiddler"],
    [/carolina/i, "Carolina"],
  ];
  return pairs.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

type LogCluster = { id: string; name: string; lat: number; lng: number; rows: CatchRow[] };

function clusterRows(rows: CatchRow[], waypoints: Waypoint[]): LogCluster[] {
  const groups = new Map<string, LogCluster>();
  for (const row of rows) {
    const place = placeOf(row, waypoints);
    if (!place) continue;
    const existing = groups.get(place.id);
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    groups.set(place.id, { ...place, rows: [row] });
  }
  return [...groups.values()].sort(
    (a, b) => b.rows.length - a.rows.length || sum(b.rows.map((row) => row.count)) - sum(a.rows.map((row) => row.count)),
  );
}

function placeOf(row: CatchRow, waypoints: Waypoint[]): { id: string; name: string; lat: number; lng: number } | null {
  const named = row.spotName?.trim();
  if (named && row.lat != null && row.lng != null) {
    return { id: `user-${named.toLowerCase()}`, name: named, lat: row.lat, lng: row.lng };
  }
  if (row.lat != null && row.lng != null) {
    const mark = nearestWaypoint(row.lat, row.lng, waypoints, 0.45);
    if (mark) return { id: `wp-${mark.id}`, name: mark.name, lat: mark.lat, lng: mark.lng };
  }
  const spot = spotById(row.spotId);
  if (spot) return { id: spot.id, name: spot.name, lat: spot.lat, lng: spot.lng };
  if (row.lat == null || row.lng == null) return null;
  const near = SPOTS.map((item) => ({ item, miles: milesBetween(row.lat!, row.lng!, item.lat, item.lng) })).sort(
    (a, b) => a.miles - b.miles,
  )[0];
  const lat = Math.round(row.lat * 100) / 100;
  const lng = Math.round(row.lng * 100) / 100;
  const name = near && near.miles <= 0.6 ? `Near ${near.item.name}` : `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  return { id: `gps-${lat.toFixed(2)}-${lng.toFixed(2)}`, name, lat: row.lat, lng: row.lng };
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

function timeSpan(rows: CatchRow[]): string | null {
  const minutes = rows
    .map((row) => clockToMinutes(row.startTime))
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  if (!minutes.length) return null;
  const mid = minutes[Math.floor(minutes.length / 2)];
  if (minutes.length < 3) return formatClock(mid);
  const low = minutes[Math.floor((minutes.length - 1) * 0.25)];
  const high = minutes[Math.floor((minutes.length - 1) * 0.75)];
  if (low === high) return formatClock(mid);
  return `${formatClock(low)}–${formatClock(high)}`;
}

function baitFromLog(rows: CatchRow[], species: Species | null): string | null {
  const noted = rows.filter((row) => isLoggedBait(row.bait));
  if (!noted.length) return "No bait is written down in the catch log yet.";
  const all = rankBait(noted);
  const [name, stats] = all[0];
  const also = all
    .slice(1, 3)
    .map(([bait]) => bait)
    .join(", ");
  let line = `Bait from the whole catch log: ${name} — ${stats.fish} fish on ${stats.trips} ${stats.trips === 1 ? "trip" : "trips"}.`;
  if (also) line += ` Also logged: ${also}.`;
  if (species) {
    const forFish = rankBait(noted.filter((row) => row.species === species));
    if (forFish.length && forFish[0][0] !== name) {
      line += ` For ${commonName(species)}, the catch log favors ${forFish[0][0]}.`;
    }
  }
  return line;
}

function isLoggedBait(bait: string): boolean {
  const name = bait.trim();
  return Boolean(name) && !/^n\/a$/i.test(name);
}

function rankBait(rows: CatchRow[]): [string, { fish: number; trips: number }][] {
  const totals = new Map<string, { fish: number; trips: number }>();
  for (const row of rows) {
    const name = row.bait.trim();
    if (!isLoggedBait(name)) continue;
    const current = totals.get(name) ?? { fish: 0, trips: 0 };
    current.fish += row.count;
    current.trips += 1;
    totals.set(name, current);
  }
  return [...totals.entries()].sort((a, b) => b[1].fish - a[1].fish || b[1].trips - a[1].trips);
}

function monthDist(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 12 - d);
}

function seasonOf(month: number): "winter" | "spring" | "summer" | "fall" {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "fall";
}

function bestStage(pool: CatchRow[]): TideStage {
  const totals = new Map<TideStage, number>();
  for (const row of pool) {
    totals.set(row.tideStage, (totals.get(row.tideStage) ?? 0) + row.count + 0.01);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? "outgoing";
}

function windAgreement(pool: CatchRow[], wind: WindDir | null): boolean {
  if (!wind || pool.length === 0) return true;
  const close = pool.filter((r) => windClose(r.windDir, wind)).length;
  return close >= pool.length / 2;
}

type WindowDesc = { start: number; end: number; label: string; pattern: string };

function describeWindow(
  offsetMin: number,
  stage: TideStage,
  pool: CatchRow[],
  conditions: Conditions | null,
): WindowDesc {
  const pattern =
    stage === "outgoing"
      ? "first two and a half hours of the outgoing"
      : stage === "incoming"
        ? "the push of the incoming"
        : stage === "high slack"
          ? "the hour around high tide"
          : "the hour around low tide";
  const events = (conditions?.tides ?? []).map((e) => ({ ...e, at: e.at + offsetMin }));
  const candidates = primeWindows(events, stage).filter((w) => w.start >= 4.5 * 60 && w.start <= 19 * 60);
  const usable = candidates.length ? candidates : primeWindows(events, stage);
  if (!usable.length || !conditions) {
    return {
      start: 7 * 60,
      end: 9.5 * 60,
      label: `${cap(pattern)} (general — tide clock unavailable)`,
      pattern,
    };
  }
  const median = medianStart(pool.filter((r) => r.count > 0 && r.tideStage === stage));
  usable.sort((a, b) => {
    const da = median == null ? distanceFromMorning(a.start) : Math.abs(a.start - median);
    const db = median == null ? distanceFromMorning(b.start) : Math.abs(b.start - median);
    return da - db;
  });
  const best = usable[0];
  const drift =
    median != null && Math.abs(best.start - median) > 90
      ? ` · your catches on this tide usually started around ${formatClock(median)}`
      : "";
  return {
    start: best.start,
    end: best.end,
    label: `${formatRange(best.start, best.end)} · ${pattern}${drift}`,
    pattern,
  };
}

function distanceFromMorning(start: number): number {
  return Math.abs(start - 7 * 60);
}

function primeWindows(events: TideEvent[], stage: TideStage): { start: number; end: number }[] {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const windows: { start: number; end: number }[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const event = sorted[i];
    if (stage === "outgoing" && event.type === "H") {
      windows.push({ start: event.at + 15, end: event.at + 150 });
    } else if (stage === "incoming" && event.type === "L") {
      windows.push({ start: event.at + 30, end: event.at + 180 });
    } else if (stage === "high slack" && event.type === "H") {
      windows.push({ start: event.at - 40, end: event.at + 40 });
    } else if (stage === "low slack" && event.type === "L") {
      windows.push({ start: event.at - 40, end: event.at + 40 });
    }
  }
  return windows.filter((w) => w.end > 0 && w.start < 1440 + 180);
}

function medianStart(rows: CatchRow[]): number | null {
  const mins = rows
    .map((r) => clockToMinutes(r.startTime))
    .filter((m): m is number => m != null)
    .sort((a, b) => a - b);
  if (!mins.length) return null;
  const mid = Math.floor(mins.length / 2);
  return mins.length % 2 ? mins[mid] : Math.round((mins[mid - 1] + mins[mid]) / 2);
}

function sliceWeather(hourly: HourPoint[], start: number, end: number) {
  const slice = hourly.filter((h) => h.at >= start - 30 && h.at <= end + 30);
  if (!slice.length) return null;
  const winds = slice.map((h) => h.windMph).filter((v): v is number => v != null);
  const codes = slice.map((h) => h.weatherCode).filter((v): v is number => v != null);
  const prec = slice.map((h) => h.precipPct).filter((v): v is number => v != null);
  const waves = slice.map((h) => h.waveFt).filter((v): v is number => v != null);
  const windHigh = winds.length ? Math.max(...winds) : null;
  const storm = codes.some((c) => c >= 95);
  const code = codes.length ? Math.max(...codes) : null;
  const precipPct = prec.length ? Math.max(...prec) : null;
  const waveFt = waves.length ? Math.max(...waves) : null;
  return { windHigh, storm, code, precipPct, waveFt };
}

function hourSliceUnsafe(
  slice: NonNullable<ReturnType<typeof sliceWeather>>,
  exposed: boolean,
): boolean {
  if (slice.storm) return true;
  if (slice.windHigh != null && slice.windHigh >= 22) return true;
  if (exposed && slice.waveFt != null && slice.waveFt >= 4) return true;
  return false;
}

function dayIsUnsafe(conditions: Conditions): boolean {
  if (conditions.daylight.storm) return true;
  if (conditions.daylight.windHigh != null && conditions.daylight.windHigh >= 22) return true;
  return false;
}

function unsafeSentence(conditions: Conditions): string {
  if (conditions.daylight.storm) {
    return `Thunder is in the ${conditions.daylight.weatherLabel.toLowerCase()} forecast. Stay off the water.`;
  }
  const high = conditions.daylight.windHigh;
  return `Daylight wind tops ${high == null ? "a small-craft breeze" : `${Math.round(high)} mph`}. That's too much for a small boat in these creeks.`;
}

function reasonsFor(
  item: {
    cluster: { name: string };
    pool: CatchRow[];
    similarCount: number;
    seasonalOnly: boolean;
    stage: TideStage;
    avgCount: number;
    windAgrees: boolean;
  },
  species: Species | null,
  waterF: number | null,
  conditions: Conditions | null,
): string[] {
  const reasons: string[] = [];
  const fish = species ? commonName(species) : "fish";
  if (item.similarCount > 0) {
    const newest = [...item.pool].sort((a, b) => b.date.localeCompare(a.date))[0];
    reasons.push(
      `${item.similarCount} ${fish} trip${item.similarCount === 1 ? "" : "s"} here match this season and the forecast, averaging ${item.avgCount.toFixed(1)} fish. Best tide in that set: ${item.stage}. Most recent is ${formatPrettyDate(newest.date)}.`,
    );
    const baits = topBaits(item.pool.filter((row) => row.count > 0));
    if (baits) reasons.push(`Bait on those trips: ${baits}.`);
  } else if (item.seasonalOnly) {
    reasons.push(
      `${item.pool.length} ${fish} trip${item.pool.length === 1 ? "" : "s"} at ${item.cluster.name} are from this season, but the wind, water, pressure, and tide were not this close.`,
    );
  } else {
    reasons.push(`No ${fish} trips at ${item.cluster.name} support this day.`);
  }
  if (!item.windAgrees && conditions?.daylight.windDir) {
    reasons.push(`Most of these trips were not on a ${conditions.daylight.windDir} wind.`);
  }
  if (conditions?.pressureTrend) {
    const same = item.pool.filter((row) => row.meteo?.pressureTrend === conditions.pressureTrend).length;
    if (same) reasons.push(`${same} of these trips had ${conditions.pressureTrend} pressure, same as the forecast.`);
  }
  if (waterF != null) {
    const temps = item.pool.map((row) => row.waterTempF).filter((temp): temp is number => temp != null);
    if (temps.length) reasons.push(`Logged water was ${Math.min(...temps)}–${Math.max(...temps)}°F. The forecast water is ${waterF}°F.`);
  }
  const lengths = item.pool.map((row) => row.lengthIn).filter((length): length is number => length != null && length > 0);
  if (lengths.length) {
    reasons.push(`Length on those trips: ${Math.min(...lengths)}–${Math.max(...lengths)} in.`);
  }
  const extras = loggedExtras(item.pool);
  if (extras) reasons.push(extras);
  return reasons.slice(0, 5);
}

function loggedExtras(rows: CatchRow[]): string | null {
  const bits: string[] = [];
  if (rows.some((row) => row.meteo?.humidity != null)) bits.push("humidity");
  if (rows.some((row) => row.meteo?.currentKt != null)) bits.push("tidal current");
  if (rows.some((row) => row.meteo?.precip24In != null)) bits.push("rain in the last 24 hours");
  if (rows.some((row) => row.meteo?.frontHours != null)) bits.push("hours before or after a front");
  if (!bits.length) return null;
  if (bits.length === 1) return `Those trips recorded ${bits[0]}, and it was part of the match.`;
  return `Those trips recorded ${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}, and each was part of the match when it was saved.`;
}

function matchSpecies(text: string): Species | null {
  const rules: { species: Species; re: RegExp }[] = [
    { species: "Red Drum", re: /\b(redfish|red\s?drum|bull reds?|slot reds?|puppy drum|reds)\b/i },
    { species: "Spotted Seatrout", re: /\b(sea\s?trout|speckled trout|specks?|trout)\b/i },
    { species: "Flounder", re: /\bflounder\b/i },
    { species: "Sheepshead", re: /\b(sheepshead|sheepies|sheephead)\b/i },
    { species: "Black Drum", re: /\bblack drum\b/i },
    { species: "Whiting", re: /\bwhiting\b/i },
  ];
  return rules.find((r) => r.re.test(text))?.species ?? null;
}

function matchArea(text: string): Area | null {
  if (/\b(west ashley|ashley river|james island)\b/i.test(text)) return "West Ashley";
  if (/\b(harbor|cooper river)\b/i.test(text)) return "Charleston Harbor";
  if (/\b(barrier|sullivan|isle of palms|\biop\b)\b/i.test(text)) return "Barrier Islands";
  if (/\b(mt\.?\s*pleasant|mount pleasant)\b/i.test(text)) return "Mt. Pleasant";
  for (const area of AREAS) {
    if (text.toLowerCase().includes(area.toLowerCase())) return area;
  }
  return null;
}

function matchTide(text: string): TideStage | null {
  if (/\b(high slack)\b/i.test(text)) return "high slack";
  if (/\b(low slack)\b/i.test(text)) return "low slack";
  if (/\b(outgoing|falling)\b/i.test(text)) return "outgoing";
  if (/\b(incoming|flood)\b/i.test(text)) return "incoming";
  return null;
}

export function commonName(species: Species | string): string {
  if (species === "Red Drum") return "redfish";
  if (species === "Spotted Seatrout") return "trout";
  return species.toLowerCase();
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function successRate(rows: CatchRow[]): string {
  if (!rows.length) return "0%";
  const ok = rows.filter((r) => r.count > 0).length;
  return `${Math.round((ok / rows.length) * 100)}%`;
}

function bestTrips(rows: CatchRow[], n: number): CatchRow[] {
  return [...rows]
    .sort((a, b) => b.count - a.count || b.date.localeCompare(a.date))
    .slice(0, n);
}

function citeRows(rows: CatchRow[]): Citation[] {
  return rows.map((row) => {
    const spot = spotById(row.spotId);
    const where =
      spot?.name ??
      (row.lat != null && row.lng != null ? `${row.lat.toFixed(3)}, ${row.lng.toFixed(3)}` : "no place");
    const fish = !row.species
      ? `${row.count} fish`
      : row.count === 0
        ? `no ${commonName(row.species)}`
        : `${row.count} ${commonName(row.species)} to ${row.lengthIn ?? "?"} in`;
    return {
      id: row.id,
      doc: "Catch log" as const,
      label: `${formatPrettyDate(row.date)} · ${where} · ${tidePhrase(row)} · ${fish} · ${row.bait || "no bait"}`,
    };
  });
}

function topBaits(rows: CatchRow[]): string | null {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!isLoggedBait(row.bait) || row.count <= 0) continue;
    counts.set(row.bait, (counts.get(row.bait) ?? 0) + row.count);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (!top.length) return null;
  return top.map(([bait, n]) => `${bait} (${n})`).join(", ");
}

function groupCount(rows: CatchRow[]): [string, number][] {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.spotId, (map.get(row.spotId) ?? 0) + row.count);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function bestLength(rows: CatchRow[]): string {
  const lens = rows.map((r) => r.lengthIn).filter((n): n is number => n != null);
  if (!lens.length) return "no size recorded";
  return `${Math.max(...lens)} in`;
}

function topMonthFacts(rows: CatchRow[]): LogFact[] {
  if (!rows.length) return [];
  const bySpecies = new Map<string, number>();
  for (const row of rows) {
    bySpecies.set(row.species, (bySpecies.get(row.species) ?? 0) + row.count);
  }
  const top = [...bySpecies.entries()].sort((a, b) => b[1] - a[1])[0];
  return [
    {
      label: "Most fish in the catch log",
      detail: top ? `${top[0]} — ${top[1]} fish across this month's trips.` : "No fish recorded.",
      citations: citeRows(bestTrips(rows, 3)),
    },
  ];
}

export function speciesFromFeatures(features: string[]): {
  species: Species | null;
  alt: Species | null;
  confidence: "high" | "medium" | "low";
  why: string;
} {
  const text = features.join(" ").toLowerCase();
  const tail = /black tail|tail spot|spot on the tail/.test(text);
  const spots = /spots? on the (back|tail)|dark spots/.test(text);
  const canines = /canine|two teeth|fangs/.test(text);
  const flat = /both eyes|one side|flatfish/.test(text);
  const stripes = /stripe/.test(text);
  const humanTeeth = /human|buck teeth|incisors/.test(text);

  if (flat) {
    return {
      species: "Flounder",
      alt: null,
      confidence: "high",
      why: "Both eyes on one side.",
    };
  }
  if (stripes && humanTeeth) {
    return {
      species: "Sheepshead",
      alt: null,
      confidence: "high",
      why: "Vertical stripes and human-like teeth.",
    };
  }
  if (stripes) {
    return {
      species: "Sheepshead",
      alt: "Black Drum",
      confidence: "low",
      why: "Stripes suggest sheepshead, but without the teeth it could be something else.",
    };
  }
  if (spots && canines) {
    return {
      species: "Spotted Seatrout",
      alt: null,
      confidence: "high",
      why: "Dark spots plus canine teeth.",
    };
  }
  if (tail) {
    return {
      species: "Red Drum",
      alt: spots ? "Spotted Seatrout" : null,
      confidence: spots ? "medium" : "high",
      why: "Black tail spot is the redfish mark. Spots on the body can confuse it with a trout.",
    };
  }
  return {
    species: null,
    alt: null,
    confidence: "low",
    why: "Nothing decisive in what you marked.",
  };
}

export function suggestedFilename(row: { date: string; species: string }): string {
  const species = row.species.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${row.date}_${species || "fish"}.jpg`;
}

export function logRowPreview(row: CatchRow): string {
  const spot = spotById(row.spotId);
  const cells = [
    row.date,
    row.startTime,
    spot?.name ?? row.spotName ?? row.spotId,
    spot?.area ?? "",
    row.tideStage,
    row.waterTempF == null ? "" : String(row.waterTempF),
    row.windDir,
    row.windMph == null ? "" : String(row.windMph),
    row.bait,
    row.species,
    String(row.count),
    row.lengthIn == null ? "" : String(row.lengthIn),
    row.weightLb == null ? "" : String(row.weightLb),
    row.photoFilename,
    row.notes,
    row.lat == null ? "" : row.lat.toFixed(5),
    row.lng == null ? "" : row.lng.toFixed(5),
  ];
  const header = [
    "Date",
    "Start Time",
    "Spot Name",
    "Area",
    "Tide Stage",
    "Water Temp",
    "Wind Direction",
    "Wind Speed",
    "Bait or Lure",
    "Species",
    "Count Caught",
    "Largest Length",
    "Largest Weight",
    "Photo Filename",
    "Notes",
    "Latitude",
    "Longitude",
  ];
  return `${header.join("\t")}\n${cells.join("\t")}`;
}

export function windLabelFromDeg(deg: number | null): WindDir | null {
  if (deg == null || Number.isNaN(deg)) return null;
  return degToWind(deg);
}

export { weatherLabel };
