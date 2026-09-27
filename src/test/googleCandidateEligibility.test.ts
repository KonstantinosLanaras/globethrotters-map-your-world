import { describe, expect, it } from "vitest";
import {
  googleCandidateRejectionReason,
  isEligibleGoogleCandidate,
} from "../../supabase/functions/_shared/googleCandidateEligibility";

const candidate = (
  displayName: string,
  primaryType: string | null,
  googleTypes: string[],
) => ({ displayName, primaryType, googleTypes });

describe("Google candidate eligibility", () => {
  it("removes lodging and retail results from food", () => {
    expect(isEligibleGoogleCandidate(
      "food",
      candidate("Radisson Blu Hotel Milan", "hotel", ["hotel", "restaurant"]),
    )).toBe(false);
    expect(isEligibleGoogleCandidate(
      "food",
      candidate("Iper La grande i", "supermarket", ["supermarket"]),
    )).toBe(false);
  });

  it("removes obvious global chains but retains local and regional businesses", () => {
    expect(googleCandidateRejectionReason(
      "food",
      candidate("Starbucks Reserve Roastery", "cafe", ["cafe"]),
    )).toBe("global_chain");
    expect(isEligibleGoogleCandidate(
      "food",
      candidate("All'Antico Vinaio", "sandwich_shop", ["restaurant"]),
    )).toBe(true);
  });

  it("keeps category boundaries without excluding mixed-use landmarks", () => {
    expect(isEligibleGoogleCandidate(
      "culture",
      candidate("Parco Sempione", "park", ["park", "tourist_attraction"]),
    )).toBe(false);
    expect(isEligibleGoogleCandidate(
      "culture",
      candidate("Galleria Vittorio Emanuele II", "historical_landmark", ["shopping_mall"]),
    )).toBe(true);
  });
});
