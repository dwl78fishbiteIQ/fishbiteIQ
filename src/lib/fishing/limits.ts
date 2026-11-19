/** South Carolina recreational limits from the 2026–2027 finfish table, updated August 11, 2026. */

export type LimitRule = {
  id: string;
  name: string;
  size: string;
  bag: string;
  minIn: number | null;
  maxIn: number | null;
  gigClosesInWinter: boolean;
  note: string;
};

export const LIMITS: LimitRule[] = [
  {
    id: "redfish",
    name: "Redfish",
    size: "18–25 in total length",
    bag: "1 per person, 2 per boat",
    minIn: 18,
    maxIn: 25,
    gigClosesInWinter: true,
    note: "State waters only. You cannot keep a redfish from federal waters. Rod and reel or gig.",
  },
  {
    id: "trout",
    name: "Trout",
    size: "14 in total length minimum",
    bag: "10 per person",
    minIn: 14,
    maxIn: null,
    gigClosesInWinter: true,
    note: "Spotted seatrout. Rod and reel or gig.",
  },
  {
    id: "flounder",
    name: "Flounder",
    size: "16 in total length minimum",
    bag: "5 per person, 10 per boat",
    minIn: 16,
    maxIn: null,
    gigClosesInWinter: false,
    note: "Southern, summer, and gulf flounder count as one limit. Hook and line or gig. The published table does not close the season.",
  },
  {
    id: "sheepshead",
    name: "Sheepshead",
    size: "14 in total length minimum",
    bag: "10 per person, 30 per boat",
    minIn: 14,
    maxIn: null,
    gigClosesInWinter: false,
    note: "No closed season in the published table.",
  },
  {
    id: "black-drum",
    name: "Black drum",
    size: "14–27 in total length",
    bag: "5 per person",
    minIn: 14,
    maxIn: 27,
    gigClosesInWinter: false,
    note: "No closed season in the published table.",
  },
  {
    id: "whiting",
    name: "Whiting",
    size: "No size limit listed",
    bag: "No bag limit listed",
    minIn: null,
    maxIn: null,
    gigClosesInWinter: false,
    note: "Whiting is not in the 2026–2027 finfish size and bag table. Confirm before you keep one.",
  },
];

export const LIMITS_SOURCE = "https://www.eregulations.com/southcarolina/fishing/finfish-size-catch-limits";

export function gigClosed(iso: string): boolean {
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  if (month === 12) return day >= 1;
  if (month === 1) return true;
  if (month === 2) return day <= 28;
  return false;
}

export function seasonLine(iso: string): string {
  if (gigClosed(iso)) {
    return "Gigging redfish and trout is closed through February 28. Rod and reel is still allowed inside the size and bag limit.";
  }
  const month = Number(iso.slice(5, 7));
  if (month >= 3 && month <= 11) {
    return "Gigging redfish and trout is open. It closes December 1.";
  }
  return "Check the season before you gig.";
}

export function lengthVerdict(rule: LimitRule, inches: number): "short" | "over" | "legal" | "unlisted" {
  if (rule.minIn == null && rule.maxIn == null) return "unlisted";
  if (rule.minIn != null && inches < rule.minIn) return "short";
  if (rule.maxIn != null && inches > rule.maxIn) return "over";
  return "legal";
}
