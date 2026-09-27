export type RatedGoogleCandidate = {
  googlePlaceId: string;
  displayName: string;
  rating: number;
  reviewCount: number;
};

// A Bayesian score prevents a small 5.0 sample from automatically outranking
// a consistently excellent place with tens of thousands of reviews. The prior
// is deliberately conservative and the 1,000-review weight matches the MVP's
// minimum evidence threshold.
export const googleCandidateQualityScore = (
  candidate: Pick<RatedGoogleCandidate, "rating" | "reviewCount">,
  priorMean = 4,
  priorWeight = 1_000,
) => (
  (candidate.rating * candidate.reviewCount + priorMean * priorWeight)
  / (candidate.reviewCount + priorWeight)
);

export const rankGoogleCandidates = <T extends RatedGoogleCandidate>(
  candidates: T[],
  minimumReviews: number,
  limit: number,
  minimumRating = 0,
) => [...new Map(candidates.map((candidate) => [candidate.googlePlaceId, candidate])).values()]
  .filter((candidate) => candidate.reviewCount >= minimumReviews && candidate.rating >= minimumRating)
  .sort((left, right) => googleCandidateQualityScore(right) - googleCandidateQualityScore(left)
    || right.reviewCount - left.reviewCount
    || right.rating - left.rating
    || left.displayName.localeCompare(right.displayName))
  .slice(0, limit);
