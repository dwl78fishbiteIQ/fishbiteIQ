import type { TideEvent, TideStage } from "@/lib/fishing/types";

const STATION = "8665530";

/** NOAA water level for one day. Only for catches logged from an uploaded photo. */
export function noaaPhotoLink(date: string): string {
  const day = date.replaceAll("-", "");
  const q = new URLSearchParams({
    id: STATION,
    units: "standard",
    bdate: day,
    edate: day,
    timezone: "LST_LDT",
    datum: "MLLW",
    interval: "6",
  });
  return `https://tidesandcurrents.noaa.gov/waterlevels.html?${q.toString()}`;
}

/** Hours after the last high or low, rounded to the nearest hour. Negative means the turn is still ahead. */
export function hoursAfterTurn(
  tides: TideEvent[],
  minutes: number,
): { hours: number; turn: "high" | "low" } | null {
  const prior = tides.filter((event) => event.at <= minutes).sort((a, b) => b.at - a.at)[0];
  const event = prior ?? tides.filter((event) => event.at > minutes).sort((a, b) => a.at - b.at)[0];
  if (!event) return null;
  return {
    hours: Math.round((minutes - event.at) / 60),
    turn: event.type === "H" ? "high" : "low",
  };
}

export function tidePhrase(row: {
  tideStage: string;
  tideHours?: number | null;
  tideTurn?: "high" | "low" | "" | null;
}): string {
  if (row.tideHours == null || (row.tideTurn !== "high" && row.tideTurn !== "low")) return row.tideStage;
  if (row.tideHours === 0) return `${row.tideStage} · on the ${row.tideTurn}`;
  const hours = Math.abs(row.tideHours);
  const unit = hours === 1 ? "hour" : "hours";
  const when = row.tideHours > 0 ? "after" : "before";
  return `${row.tideStage} · ${hours} ${unit} ${when} the ${row.tideTurn}`;
}

export function stageFromStation(tides: TideEvent[], minutes: number): TideStage | null {
  if (!tides.length) return null;
  let nearest = tides[0];
  for (const event of tides) {
    if (Math.abs(event.at - minutes) < Math.abs(nearest.at - minutes)) nearest = event;
  }
  if (Math.abs(nearest.at - minutes) <= 40) {
    return nearest.type === "H" ? "high slack" : "low slack";
  }
  let before: TideEvent | null = null;
  for (const event of tides) {
    if (event.at <= minutes) before = event;
  }
  const edge = before ?? tides[0];
  return edge.type === "H" ? "outgoing" : "incoming";
}
