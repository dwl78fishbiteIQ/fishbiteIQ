import { createServerFn } from "@tanstack/react-start";
import { readMarks, resolveSpecies } from "@/lib/fishing/species-id";
import type { PhotoResult, Species } from "@/lib/fishing/types";
import { SPECIES } from "@/lib/fishing/types";

const MAX_CHARS = 1_800_000;

export const readPhoto = createServerFn({ method: "POST" })
  .validator((input: { imageDataUrl: string }) => {
    if (!input || typeof input.imageDataUrl !== "string") {
      throw new Error("No photo attached.");
    }
    if (!input.imageDataUrl.startsWith("data:image/")) {
      throw new Error("Use a JPEG, PNG, or WebP photo.");
    }
    if (input.imageDataUrl.length > MAX_CHARS) {
      throw new Error("That photo is too large. Try a smaller one.");
    }
    return { imageDataUrl: input.imageDataUrl };
  })
  .handler(async ({ data }): Promise<PhotoResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        message: "Photo reading isn't available right now. Mark the features you can see and I'll still log the fish.",
      };
    }

    const prompt = `You analyze fishing photos for inshore waters around Mt. Pleasant and Charleston, SC.
Return ONLY a JSON object with keys:
kind: "catch" if a fish is the subject, "spot" if the scene is water or structure, otherwise "unclear"
species: one of ${SPECIES.map((s) => `"${s}"`).join(", ")} or null
speciesAlt: same list or null when a lookalike is plausible
confidence: "high", "medium", or "low"
features: up to 4 short visible traits
marks: an object of booleans, true only when that trait is visible:
  tailSpot (one black spot at the base of the tail),
  backSpots (dark spots scattered on the back),
  tailSpots (dark spots on the tail itself, not a single base spot),
  canineTeeth (two large fangs),
  bothEyesOneSide,
  verticalStripes,
  humanTeeth (incisors like a sheep),
  chinBarbels
lengthLow and lengthHigh: inch numbers or null, always a range
lengthBasis: what you used (measuring board, hand, cooler, rod, deck) or "no reference in frame"
setting: one or two sentences on structure, water color or clarity, bait, birds, current lines, and light. Do not name local spots. Do not invent GPS, tide stage, weather, or time unless a clock is printed on the image.
Report the marks you can see. Do not name a species from a guess when the marks are absent.
If two species are easily confused, set speciesAlt and lower confidence.
Never treat a length estimate as a legal measurement.
If you cannot tell, use confidence low and species null.`;

    const body = {
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
    };

    let res = await callGrok(apiKey, { ...body, response_format: { type: "json_object" } });
    if (res.status === 400) res = await callGrok(apiKey, body);
    if (!res.ok) {
      return { ok: false, message: "I couldn't read that photo. Mark what you see instead." };
    }
    try {
      const json = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const text = contentText(json.choices?.[0]?.message?.content);
      return normalize(parseJson(text));
    } catch {
      return { ok: false, message: "I couldn't read that photo. Mark what you see instead." };
    }
  });

async function callGrok(apiKey: string, body: unknown): Promise<Response> {
  return fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

function parseJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(raw.slice(start, end + 1));
}

function normalize(value: unknown): PhotoResult {
  if (!value || typeof value !== "object") {
    return { ok: false, message: "I couldn't read that photo. Mark what you see instead." };
  }
  const row = value as Record<string, unknown>;
  const kind = row.kind === "catch" || row.kind === "spot" || row.kind === "unclear" ? row.kind : "unclear";
  const confidence =
    row.confidence === "high" || row.confidence === "medium" || row.confidence === "low"
      ? row.confidence
      : "low";
  const features = Array.isArray(row.features)
    ? row.features.filter((f): f is string => typeof f === "string").slice(0, 4)
    : [];
  const named = resolveSpecies({
    species: asSpecies(row.species),
    speciesAlt: asSpecies(row.speciesAlt),
    confidence,
    features,
    marks: readMarks(row.marks),
  });
  return {
    ok: true,
    kind,
    species: named.species,
    speciesAlt: named.speciesAlt,
    confidence: named.confidence,
    features,
    lengthLow: asInches(row.lengthLow),
    lengthHigh: asInches(row.lengthHigh),
    lengthBasis: typeof row.lengthBasis === "string" ? row.lengthBasis.slice(0, 180) : "no reference in frame",
    setting: typeof row.setting === "string" ? row.setting.slice(0, 500) : "",
  };
}

function asSpecies(value: unknown): Species | null {
  if (typeof value !== "string") return null;
  return SPECIES.find((s) => s.toLowerCase() === value.toLowerCase()) ?? null;
}

function asInches(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 80) return null;
  return Math.round(n);
}
