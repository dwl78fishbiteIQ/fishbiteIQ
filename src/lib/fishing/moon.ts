export type MoonBucket = "new" | "waxing" | "full" | "waning";

export type MoonInfo = {
  name: string;
  bucket: MoonBucket;
  /** 0–1 */
  illumination: number;
  /** Days since the new moon, 0–29.5. */
  age: number;
};

const SYNODIC = 29.530588853;
const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14, 0);

export function moonOn(isoDate: string): MoonInfo {
  const [y, m, d] = isoDate.split("-").map(Number);
  const at = Date.UTC(y, m - 1, d, 17, 0, 0);
  const days = (at - KNOWN_NEW) / 86_400_000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const illumination = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;

  let name = "New moon";
  let bucket: MoonBucket = "new";
  if (age < 1.8 || age >= 27.7) {
    name = "New moon";
    bucket = "new";
  } else if (age < 6.4) {
    name = "Waxing crescent";
    bucket = "waxing";
  } else if (age < 9.2) {
    name = "First quarter";
    bucket = "waxing";
  } else if (age < 13.8) {
    name = "Waxing gibbous";
    bucket = "waxing";
  } else if (age < 16.2) {
    name = "Full moon";
    bucket = "full";
  } else if (age < 20.8) {
    name = "Waning gibbous";
    bucket = "waning";
  } else if (age < 23.6) {
    name = "Last quarter";
    bucket = "waning";
  } else {
    name = "Waning crescent";
    bucket = "new";
  }

  return { name, bucket, illumination, age };
}
