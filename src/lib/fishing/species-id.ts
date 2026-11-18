import type { Species } from "@/lib/fishing/types";

export type SpeciesMarks = {
  /** One black spot at the base of the tail. */
  tailSpot: boolean;
  /** Dark spots scattered on the back. */
  backSpots: boolean;
  /** Dark spots on the tail, not a single spot at the base. */
  tailSpots: boolean;
  /** Two large canine teeth. */
  canineTeeth: boolean;
  /** Both eyes on the same side of the head. */
  bothEyesOneSide: boolean;
  /** Bold vertical bars down the body. */
  verticalStripes: boolean;
  /** Human-like incisors. */
  humanTeeth: boolean;
  /** Whiskers on the chin. */
  chinBarbels: boolean;
};

export type SpeciesCall = {
  species: Species | null;
  speciesAlt: Species | null;
  confidence: "high" | "medium" | "low";
};

const NONE: SpeciesMarks = {
  tailSpot: false,
  backSpots: false,
  tailSpots: false,
  canineTeeth: false,
  bothEyesOneSide: false,
  verticalStripes: false,
  humanTeeth: false,
  chinBarbels: false,
};

export function emptyMarks(): SpeciesMarks {
  return { ...NONE };
}

function flag(value: unknown): boolean {
  return value === true || value === "true" || value === "yes";
}

/** Marks the photo reader reports, or null when that block is missing. */
export function readMarks(value: unknown): SpeciesMarks | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    tailSpot: flag(row.tailSpot),
    backSpots: flag(row.backSpots),
    tailSpots: flag(row.tailSpots),
    canineTeeth: flag(row.canineTeeth),
    bothEyesOneSide: flag(row.bothEyesOneSide),
    verticalStripes: flag(row.verticalStripes),
    humanTeeth: flag(row.humanTeeth),
    chinBarbels: flag(row.chinBarbels),
  };
}

/** Pull the same marks out of a written description. */
export function marksFromText(text: string): SpeciesMarks {
  const line = text.toLowerCase();
  const humanTeeth = /human[- ]like teeth|incisors|buck teeth|sheep(s)?head teeth/.test(line);
  return {
    tailSpot: /tail spot|spot at the (base|top) of the tail|ocellu?s|one black spot/.test(line),
    backSpots: /spots on the back|spotted back|spots along the back/.test(line),
    tailSpots: /spots on the tail|spotted tail|spots scattered on the tail/.test(line),
    canineTeeth: !humanTeeth && /canine|two (large )?teeth|fangs/.test(line),
    bothEyesOneSide: /both eyes|eyes on one side|flatfish/.test(line),
    verticalStripes: /vertical (stripes|bars)|bold bars/.test(line),
    humanTeeth,
    chinBarbels: /barbel|whiskers on the chin|chin whisker/.test(line),
  };
}

function orMarks(left: SpeciesMarks, right: SpeciesMarks): SpeciesMarks {
  return {
    tailSpot: left.tailSpot || right.tailSpot,
    backSpots: left.backSpots || right.backSpots,
    tailSpots: left.tailSpots || right.tailSpots,
    canineTeeth: left.canineTeeth || right.canineTeeth,
    bothEyesOneSide: left.bothEyesOneSide || right.bothEyesOneSide,
    verticalStripes: left.verticalStripes || right.verticalStripes,
    humanTeeth: left.humanTeeth || right.humanTeeth,
    chinBarbels: left.chinBarbels || right.chinBarbels,
  };
}

function hasAny(marks: SpeciesMarks): boolean {
  return Object.values(marks).some(Boolean);
}

/**
 * Name the fish from what is visible. A single strong mark wins.
 * A weak or mixed set stays uncertain instead of guessing.
 */
export function identifySpecies(marks: SpeciesMarks): SpeciesCall {
  if (marks.bothEyesOneSide) {
    return { species: "Flounder", speciesAlt: null, confidence: "high" };
  }
  if (marks.verticalStripes && marks.humanTeeth) {
    return { species: "Sheepshead", speciesAlt: null, confidence: "high" };
  }
  if (marks.chinBarbels && !marks.tailSpot) {
    return {
      species: "Black Drum",
      speciesAlt: marks.verticalStripes ? "Sheepshead" : null,
      confidence: marks.verticalStripes ? "medium" : "high",
    };
  }
  if (marks.backSpots && marks.tailSpots && marks.canineTeeth) {
    return { species: "Spotted Seatrout", speciesAlt: null, confidence: "high" };
  }
  if (marks.backSpots && marks.tailSpots) {
    return { species: "Spotted Seatrout", speciesAlt: null, confidence: "medium" };
  }
  if (marks.tailSpot && !marks.backSpots && !marks.tailSpots) {
    return {
      species: "Red Drum",
      speciesAlt: marks.chinBarbels ? "Black Drum" : null,
      confidence: marks.chinBarbels ? "medium" : "high",
    };
  }
  if (marks.verticalStripes) {
    return { species: "Sheepshead", speciesAlt: "Black Drum", confidence: "medium" };
  }
  if (marks.canineTeeth || marks.tailSpot) {
    return {
      species: marks.tailSpot ? "Red Drum" : "Spotted Seatrout",
      speciesAlt: marks.tailSpot ? "Spotted Seatrout" : null,
      confidence: "low",
    };
  }
  return { species: null, speciesAlt: null, confidence: "low" };
}

function lower(confidence: SpeciesCall["confidence"]): SpeciesCall["confidence"] {
  if (confidence === "high") return "medium";
  return "low";
}

/** Prefer the visible marks. Keep the model's name only when the marks do not decide. */
export function resolveSpecies(input: {
  species: Species | null;
  speciesAlt: Species | null;
  confidence: SpeciesCall["confidence"];
  features: string[];
  marks: SpeciesMarks | null;
}): SpeciesCall {
  const marks = orMarks(input.marks ?? emptyMarks(), marksFromText(input.features.join(" ")));
  const ruled = identifySpecies(marks);
  if (!hasAny(marks)) {
    if (!input.species) return { species: null, speciesAlt: input.speciesAlt, confidence: "low" };
    return {
      species: input.species,
      speciesAlt: input.speciesAlt,
      confidence: input.confidence === "high" ? "medium" : input.confidence,
    };
  }
  if (!ruled.species) {
    return {
      species: input.species,
      speciesAlt: input.speciesAlt,
      confidence: "low",
    };
  }
  const disagreed = input.species != null && input.species !== ruled.species;
  return {
    species: ruled.species,
    speciesAlt: disagreed ? input.species : ruled.speciesAlt,
    confidence: disagreed ? lower(ruled.confidence) : ruled.confidence,
  };
}
