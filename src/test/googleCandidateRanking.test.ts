import { describe, expect, it } from "vitest";
import {
  googleCandidateQualityScore,
  rankGoogleCandidates,
} from "../../supabase/functions/_shared/googleCandidateRanking";

const candidate = (id: string, rating: number, reviewCount: number) => ({
  googlePlaceId: id,
  displayName: id,
  rating,
  reviewCount,
});

describe("Google candidate ranking", () => {
  it("rewards durable review evidence instead of sorting by stars alone", () => {
    const smallPerfect = candidate("small-perfect", 5, 1_000);
    const durableExcellent = candidate("durable-excellent", 4.8, 50_000);

    expect(googleCandidateQualityScore(durableExcellent))
      .toBeGreaterThan(googleCandidateQualityScore(smallPerfect));
    expect(rankGoogleCandidates([smallPerfect, durableExcellent], 1_000, 10)[0].googlePlaceId)
      .toBe("durable-excellent");
  });

  it("enforces the evidence threshold, removes duplicate place IDs and respects the limit", () => {
    const ranked = rankGoogleCandidates([
      candidate("below-threshold", 5, 999),
      candidate("a", 4.7, 20_000),
      candidate("a", 4.7, 20_000),
      candidate("b", 4.6, 30_000),
    ], 1_000, 1);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].googlePlaceId).toBe("a");
  });
});
