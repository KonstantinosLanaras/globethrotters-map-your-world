import type { CatalogSearchCategory } from "./googleSearchStrategy.ts";

export type GoogleCandidateForEligibility = {
  displayName: string;
  primaryType: string | null;
  googleTypes: string[];
};

export type GoogleCandidateRejectionReason =
  | "incompatible_place_type"
  | "global_chain";

const FOOD_INCOMPATIBLE_TYPES = new Set([
  "hotel",
  "lodging",
  "supermarket",
  "grocery_store",
  "convenience_store",
  "department_store",
  "shopping_mall",
]);

const FOOD_INCOMPATIBLE_PRIMARY_TYPES = new Set([
  ...FOOD_INCOMPATIBLE_TYPES,
  "night_club",
  "live_music_venue",
]);

const CULTURE_INCOMPATIBLE_PRIMARY_TYPES = new Set([
  "beach",
  "botanical_garden",
  "garden",
  "hiking_area",
  "national_park",
  "nature_preserve",
  "park",
  "scenic_spot",
]);

// Deliberately narrow: this removes obvious multinational chains without
// excluding local groups or celebrated regional businesses automatically.
const GLOBAL_FOOD_CHAIN_NAMES = [
  /\bstarbucks\b/i,
  /\bmcdonald'?s\b/i,
  /\bburger king\b/i,
  /\bkfc\b/i,
  /\bsubway\b/i,
  /\bdomino'?s\b/i,
  /\bpizza hut\b/i,
  /\bfive guys\b/i,
  /\bcosta coffee\b/i,
  /\bhard rock cafe\b/i,
];

export const googleCandidateRejectionReason = (
  category: CatalogSearchCategory,
  candidate: GoogleCandidateForEligibility,
): GoogleCandidateRejectionReason | null => {
  if (category === "food") {
    if (
      (candidate.primaryType && FOOD_INCOMPATIBLE_PRIMARY_TYPES.has(candidate.primaryType)) ||
      candidate.googleTypes.some((type) => FOOD_INCOMPATIBLE_TYPES.has(type))
    ) {
      return "incompatible_place_type";
    }

    if (GLOBAL_FOOD_CHAIN_NAMES.some((pattern) => pattern.test(candidate.displayName))) {
      return "global_chain";
    }
  }

  if (
    category === "culture" &&
    candidate.primaryType &&
    CULTURE_INCOMPATIBLE_PRIMARY_TYPES.has(candidate.primaryType)
  ) {
    return "incompatible_place_type";
  }

  return null;
};

export const isEligibleGoogleCandidate = (
  category: CatalogSearchCategory,
  candidate: GoogleCandidateForEligibility,
) => googleCandidateRejectionReason(category, candidate) === null;
