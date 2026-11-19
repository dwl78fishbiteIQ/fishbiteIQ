/** South Carolina saltwater limits from the 2026–2027 SCDNR guide, updated August 11, 2026. */

export type SeasonStatus = { label: string; closed: boolean };

export type LimitRule = {
  id: string;
  name: string;
  size: string;
  bag: string;
  note: string;
  season: (iso: string) => SeasonStatus;
};

const open = (): SeasonStatus => ({ label: "Open", closed: false });
const prohibited = (): SeasonStatus => ({ label: "Possession prohibited", closed: true });

function monthDay(iso: string): [number, number] {
  return [Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];
}

function gigSeason(iso: string): SeasonStatus {
  return gigClosed(iso)
    ? { label: "Gig closed", closed: true }
    : { label: "Open, including gig", closed: false };
}

function shellfishSeason(iso: string): SeasonStatus {
  const [month, day] = monthDay(iso);
  const closed = (month === 5 && day >= 16) || (month > 5 && month < 10);
  return closed
    ? { label: "Usually closed", closed: true }
    : { label: "Usually open", closed: false };
}

function shrimpSeineSeason(iso: string): SeasonStatus {
  const [month, day] = monthDay(iso);
  const closed = month < 5 || (month === 12 && day >= 16);
  return closed ? { label: "Closed", closed: true } : { label: "Open", closed: false };
}

function shrimpBaitingSeason(iso: string): SeasonStatus {
  if (iso === "2026-09-11" || iso === "2026-11-09") {
    return { label: "Changes at noon", closed: false };
  }
  if (iso > "2026-09-11" && iso < "2026-11-09") return { label: "2026 season open", closed: false };
  return { label: "2026 season closed", closed: true };
}

function stripedBassSeason(iso: string): SeasonStatus {
  const [month, day] = monthDay(iso);
  const closed = (month === 6 && day >= 16) || (month > 6 && month < 10);
  return closed ? { label: "Closed", closed: true } : { label: "Open", closed: false };
}

const stateOpen = (): SeasonStatus => ({ label: "Open in state waters", closed: false });

const ROWS: [string, string, string, string][] = [
  ["Albacore", "No size limit listed", "No bag limit listed", "No associated regulations."],
  ["Almaco jack", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["American shad", "No size limit listed", "10 per person. 20 per person in the Santee River and Rediversion Canal", "See the shad and herring rules for the license and gear."],
  ["Atlantic croaker", "No size limit listed", "50 per person aggregate with spot and whiting", "Hook and line only."],
  ["Atlantic sharpnose shark", "No size limit listed", "1 per person", "Rod and reel or handline. Landed with head, fins, and tail on."],
  ["Banded rudderfish", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Bar jack", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Bigeye tuna", "27 in curved fork length", "See the federal HMS permit", "An HMS permit is required."],
  ["Black drum", "14–27 in total length", "5 per person", "No closed season in the published table."],
  ["Black grouper", "24 in total length", "1 gag or black grouper, not both. Counts toward 3 grouper.", "Federal waters closed Jan. 1–Apr. 30, 2027. State waters have no closed season. For-hire captain and crew bag is zero."],
  ["Black sea bass", "13 in total length", "7 per person", "No closed season in state waters."],
  ["Blackfin snapper", "No size limit listed", "10 per person from the snapper group", "Lane, cubera, yellowtail, gray, blackfin, silk, queen, and mutton share that group."],
  ["Blackfin tuna", "No size limit listed", "No bag limit listed", "No associated regulations."],
  ["Blacknose shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Group also includes blacktip, blue, bull, finetooth, lemon, nurse, porbeagle, spinner, thresher, and tiger."],
  ["Blacktip shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Blue crab", "5 in carapace width, point to point", "1 US bushel per person, 2 per boat", "Females with eggs must go back immediately."],
  ["Blue marlin", "99 in fork length from the lower jaw", "No bag listed", "Rod and reel only. Recreational billfish cannot be sold."],
  ["Blue shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Bluefin tuna", "See the federal HMS page", "Federal daily limit. Check it before you go.", "Report a landed bluefin to NMFS within 24 hours. An HMS permit is required."],
  ["Bluefish", "No size limit listed", "5 per person. 7 per person on a for-hire trip", "No closed season in the published table."],
  ["Blueline tilefish", "No size limit listed", "3 per person in state waters, 2 in federal waters. Counts toward 3 grouper.", "Federal waters closed Sept. 1, 2026–Apr. 30, 2027. State waters have no closed season."],
  ["Bonnethead shark", "No size limit listed", "1 per person", "Rod and reel or handline."],
  ["Bull shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Clams", "1 in minimum thickness", "1/2 US bushel per person from public or state grounds", "No more than 2 harvest days in 7. A boat or vehicle may hold only 3 personal limits."],
  ["Cobia", "36 in fork length", "1 per person. 6 per boat north of Jeremy Inlet. 3 per boat south of it.", "Charleston is north of Jeremy Inlet. State waters south of that line are closed May 1–31. Rod and reel or gig."],
  ["Coney", "No size limit listed", "Counts toward 3 grouper per person", "Federal waters closed Jan. 1–Apr. 30. State waters have no closed season."],
  ["Cubera snapper", "12 in total length", "10 per person from the snapper group", "Shares the group limit with lane, yellowtail, gray, blackfin, silk, queen, and mutton."],
  ["Dogfish", "No size limit listed", "No bag limit listed", "Spiny and smooth dogfish. No associated regulations."],
  ["Dolphin", "20 in fork length", "10 per person, 54 per boat. Headboats have no boat limit.", "Cannot be sold. A for-hire boat needs a dolphin-wahoo permit in federal waters."],
  ["Finetooth shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Florida pompano", "No size limit listed", "No bag limit listed", "No associated regulations."],
  ["Flounder", "16 in total length", "5 per person, 10 per boat", "Southern, summer, and gulf flounder are one limit. Hook and line or gig. The table does not close the season."],
  ["Gafftopsail catfish", "No size limit listed", "Possession prohibited", "Hardhead and gafftopsail catfish must be released immediately."],
  ["Gag grouper", "24 in total length", "1 gag or black grouper, not both. Counts toward 3 grouper.", "Federal waters closed Aug. 2, 2026–Apr. 30, 2027. State waters have no closed season. For-hire captain and crew bag is zero."],
  ["Golden tilefish", "No size limit listed", "1 per person. Counts toward 3 grouper.", "Federal waters closed Mar. 21–Dec. 31, 2026. State waters have no closed season."],
  ["Goliath grouper", "No size limit listed", "Possession prohibited", "Release it immediately."],
  ["Gray snapper", "12 in total length", "10 per person from the snapper group", "Shares the group limit with lane, cubera, yellowtail, blackfin, silk, queen, and mutton."],
  ["Gray triggerfish", "12 in fork length", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Graysby", "No size limit listed", "Counts toward 3 grouper per person", "Federal waters closed Jan. 1–Apr. 30. State waters have no closed season."],
  ["Great hammerhead shark", "78 in fork length", "1 shark per vessel per trip, from the hammerhead group", "Group also includes scalloped and smooth hammerhead."],
  ["Greater amberjack", "28 in fork length", "1 per person", "Federal waters closed April 1–30. State waters have no closed season."],
  ["Hardhead catfish", "No size limit listed", "Possession prohibited", "Hardhead and gafftopsail catfish must be released immediately."],
  ["Herring", "No size limit listed", "1 US bushel per person", "See the shad and herring rules for the license and gear."],
  ["Hogfish", "17 in fork length", "2 per person", "No closed season in state waters."],
  ["Hybrid bass", "No size limit in most salt water. 27 in total length on the lower Savannah River.", "No bag limit in most salt water. 2 per person on the lower Savannah River.", "White bass is in this combination."],
  ["Jolthead porgy", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["King mackerel", "24 in fork length", "3 per person", "A for-hire boat needs a coastal migratory pelagics permit in federal waters."],
  ["Knobbed porgy", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Lane snapper", "8 in total length", "10 per person from the snapper group", "Shares the group limit with cubera, yellowtail, gray, blackfin, silk, queen, and mutton."],
  ["Lemon shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Lesser amberjack", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Little tunny", "No size limit listed", "No bag limit listed", "Also called bonita. No associated regulations."],
  ["Longbill spearfish", "No size limit listed", "Possession prohibited", "Release it immediately."],
  ["Margate", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Misty grouper", "No size limit listed", "Counts toward 3 grouper per person", "No closed season in state waters."],
  ["Mutton snapper", "18 in total length", "5 per person, inside the 10-fish snapper group", "Counts toward the lane, cubera, yellowtail, and gray group."],
  ["Nassau grouper", "No size limit listed", "Possession prohibited", "Release it immediately."],
  ["Nurse shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Oysters", "No size limit listed", "2 US bushels per person from public or state grounds", "No more than 2 harvest days in 7. A boat or vehicle may hold only 3 personal limits. Call (843) 953-9300. The season can be shortened or extended."],
  ["Porbeagle shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Prohibited sharks", "No size limit listed", "Possession prohibited", "Angel, basking, bignose, bigeye sand tiger, bigeye sixgill, bigeye thresher, Caribbean reef, Caribbean sharpnose, dusky, Galapagos, longfin mako, narrowtooth, night, oceanic whitetip, sand tiger, sandbar, sevengill, shortfin mako, silky, sixgill, smalltail, whale, and white. Release without taking it out of the water."],
  ["Queen snapper", "No size limit listed", "10 per person from the snapper group", "Shares the group with blackfin and silk."],
  ["Red drum", "18–25 in total length", "1 per person, 2 per boat", "State waters only. Cannot be kept from federal waters. Rod and reel or gig. Gig closed Dec. 1–Feb. 28."],
  ["Red grouper", "20 in total length", "Counts toward 3 grouper per person", "Federal waters closed Jan. 1–May 31. State waters have no closed season."],
  ["Red hind", "No size limit listed", "Counts toward 3 grouper per person", "Federal waters closed Jan. 1–Apr. 30. State waters have no closed season."],
  ["Red porgy", "14 in total length", "1 per person", "Federal waters closed Jan. 1–Apr. 30 and July 1–Dec. 31. State waters have no closed season."],
  ["Red snapper", "20 in total length in state waters", "2 per person in state waters", "Possession prohibited in federal waters. See dnr.sc.gov/redsnapper."],
  ["Rock hind", "No size limit listed", "Counts toward 3 grouper per person", "Federal waters closed Jan. 1–Apr. 30. State waters have no closed season."],
  ["Roundscale spearfish", "66 in fork length from the lower jaw", "No bag listed", "Rod and reel only."],
  ["Sailfish", "63 in fork length from the lower jaw", "No bag listed", "Rod and reel only. Recreational billfish cannot be sold."],
  ["Sand tilefish", "No size limit listed", "3 per person. Counts toward 3 grouper.", "No closed season in state waters."],
  ["Saucereye porgy", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Scalloped hammerhead shark", "78 in fork length", "1 shark per vessel per trip, from the hammerhead group", "Group also includes great and smooth hammerhead."],
  ["Scamp", "20 in total length", "3 per person in state waters. 1 scamp or yellowmouth, not both, in federal waters.", "Counts toward 3 grouper. Federal waters closed Jan. 1–Apr. 30. State waters have no closed season."],
  ["Scup", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Sheepshead", "14 in total length", "10 per person, 30 per boat", "No closed season in the published table."],
  ["Shrimp, baiting", "No size limit listed", "48 quarts whole or 29 quarts headed per set of poles, sunrise to sunrise", "2026 season was Sept. 11 at noon through Nov. 9 at noon. A baiting license is required. Shrimp over bait cannot be sold."],
  ["Shrimp, without bait", "No size limit listed", "48 quarts whole or 29 quarts headed per day, sunrise to sunrise", "Closed Dec. 16–Apr. 30. 12 dozen may be kept per boat during the closure."],
  ["Silk snapper", "No size limit listed", "10 per person from the snapper group", "Shares the group with blackfin and queen."],
  ["Skipjack tuna", "No size limit listed", "No bag limit listed", "No associated regulations."],
  ["Smooth hammerhead shark", "78 in fork length", "1 shark per vessel per trip, from the hammerhead group", "Group also includes great and scalloped hammerhead."],
  ["Snowy grouper", "No size limit listed", "Counts toward 3 grouper. 1 fish per vessel.", "Federal waters closed June 7, 2026–Apr. 30, 2027. State waters have no closed season."],
  ["Spadefish", "14 in total length in state waters", "20 per person aggregate, no more than 10 of one species. 30 per boat in state waters.", "No closed season in state waters."],
  ["Spanish mackerel", "12 in fork length", "15 per person", "A for-hire boat needs a coastal migratory pelagics permit in federal waters."],
  ["Speckled hind", "No size limit listed", "Possession prohibited", "Release it immediately."],
  ["Spinner shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Spiny lobster", "3 in minimum carapace", "2 per person", "Do not take the tail off at sea. Do not keep a female with eggs."],
  ["Spot", "No size limit listed", "50 per person aggregate with croaker and whiting", "Hook and line only."],
  ["Spotted seatrout", "14 in total length", "10 per person", "Rod and reel or gig. Gig closed Dec. 1–Feb. 28."],
  ["Stone crab", "Claw forearm at least 2 3/4 in", "One claw from a crab that has both", "Keep the larger claw only. Do not take a claw from a female with eggs. Do not keep the body."],
  ["Striped bass", "26 in total length. 27 in on the lower Savannah River.", "3 per person Oct. 1–June 15. Closed June 16–Sept. 30. 2 per person year-round on the lower Savannah.", "Rod and reel only."],
  ["Swordfish", "47 in fork length from the lower jaw, or 25 in from cleithrum to keel", "1 per person, 4 per vessel per trip", "Rod and reel or a handline that stays with the boat."],
  ["Tarpon", "77 in fork length", "1 per person", "Rod and reel only."],
  ["Thresher shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Tiger shark", "54 in fork length", "1 shark per vessel per trip, from the large-coastal group", "Circle hook required except with flies or artificial lures."],
  ["Tripletail", "18 in total length", "3 per person, 9 per boat", "No closed season in the published table."],
  ["Vermilion snapper", "12 in total length", "5 per person", "No closed season in state waters."],
  ["Wahoo", "No size limit listed", "2 per person", "Cannot be sold. A for-hire boat needs a dolphin-wahoo permit in federal waters."],
  ["Warsaw grouper", "No size limit listed", "Possession prohibited", "Release it immediately."],
  ["Weakfish", "12 in total length", "1 per person", "No closed season in the published table."],
  ["White bass", "No size limit in most salt water. 27 in total length on the lower Savannah River.", "No bag limit in most salt water. 2 per person on the lower Savannah River.", "Counted with hybrid bass."],
  ["White grunt", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["White marlin", "66 in fork length from the lower jaw", "No bag listed", "Rod and reel only. Recreational billfish cannot be sold."],
  ["Whitebone porgy", "No size limit listed", "20 per person aggregate, no more than 10 of one species", "Other snapper-grouper complex. No closed season in state waters."],
  ["Whiting", "No size limit listed", "50 per person aggregate with croaker and spot", "Hook and line only."],
  ["Wreckfish", "No size limit listed", "1 per vessel", "Federal waters closed Jan. 1–June 30 and Sept. 1–Dec. 31. State waters have no closed season."],
  ["Yellowedge grouper", "No size limit listed", "Counts toward 3 grouper per person", "No closed season in state waters."],
  ["Yellowfin grouper", "20 in total length", "Counts toward 3 grouper per person", "Federal waters closed Jan. 1–Apr. 30. State waters have no closed season."],
  ["Yellowfin tuna", "27 in curved fork length", "3 per person per trip", "An HMS permit is required in federal waters and for possession in state waters."],
  ["Yellowmouth grouper", "20 in total length", "3 per person in state waters. 1 scamp or yellowmouth, not both, in federal waters.", "Counts toward 3 grouper. Federal waters closed Jan. 1–Apr. 30."],
  ["Yellowtail snapper", "12 in total length", "10 per person from the snapper group", "Shares the group limit with lane, cubera, gray, blackfin, silk, queen, and mutton."],
];

const SEASON: Record<string, (iso: string) => SeasonStatus> = {
  "Red drum": gigSeason,
  "Spotted seatrout": gigSeason,
  "Hardhead catfish": prohibited,
  "Gafftopsail catfish": prohibited,
  "Longbill spearfish": prohibited,
  "Goliath grouper": prohibited,
  "Nassau grouper": prohibited,
  "Speckled hind": prohibited,
  "Warsaw grouper": prohibited,
  "Prohibited sharks": prohibited,
  Oysters: shellfishSeason,
  Clams: shellfishSeason,
  "Shrimp, without bait": shrimpSeineSeason,
  "Shrimp, baiting": shrimpBaitingSeason,
  "Striped bass": stripedBassSeason,
};

export const LIMITS: LimitRule[] = ROWS.map(([name, size, bag, note]) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  name,
  size,
  bag,
  note,
  season: SEASON[name] ?? (name.includes("grouper") || name.includes("tilefish") || name.includes("amberjack") || name.includes("snapper") || name.includes("porgy") || name === "Wreckfish" || name === "Hogfish" || name === "Black sea bass" || name === "Spadefish" || name === "Gray triggerfish" ? stateOpen : open),
})).sort((a, b) => a.name.localeCompare(b.name));

export const LIMITS_SOURCE = "https://www.eregulations.com/southcarolina/fishing/finfish-size-catch-limits";

export function gigClosed(iso: string): boolean {
  const [month, day] = monthDay(iso);
  if (month === 12) return day >= 1;
  if (month === 1) return true;
  if (month === 2) return day <= 28;
  return false;
}

export function seasonLine(iso: string): string {
  if (gigClosed(iso)) {
    return "Gigging redfish and trout is closed through February 28. Rod and reel is still allowed inside the size and bag limit.";
  }
  return "Gigging redfish and trout is open. It closes December 1.";
}
