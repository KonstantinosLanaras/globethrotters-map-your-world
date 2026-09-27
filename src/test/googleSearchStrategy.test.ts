import { describe, expect, it } from "vitest";
import {
  buildGoogleSearchRequest,
  estimateMaximumGoogleRequests,
  googleSearchPageLimit,
} from "../../supabase/functions/_shared/googleSearchStrategy";

const city = {
  name: "Milan",
  country: "Italy",
  country_code: "IT",
  latitude: 45.4642,
  longitude: 9.19,
  search_radius_km: 25,
};

describe("Google search strategy", () => {
  it("uses one popularity-ranked Nearby request for food", () => {
    const request = buildGoogleSearchRequest("food", city, 4.2, "ignored-token");

    expect(request.method).toBe("nearby_popularity");
    expect(request.url).toContain("searchNearby");
    expect(request.body).toMatchObject({
      rankPreference: "POPULARITY",
      maxResultCount: 20,
      includedTypes: ["restaurant", "cafe", "bakery"],
      excludedTypes: ["fast_food_restaurant"],
      locationRestriction: { circle: { radius: 25_000 } },
    });
    expect(request.body).not.toHaveProperty("minRating");
    expect(request.fieldMask).not.toContain("nextPageToken");
    expect(googleSearchPageLimit("food", 3)).toBe(1);
  });

  it("uses paginated, city-restricted Text Search for culture", () => {
    const request = buildGoogleSearchRequest("culture", city, 4, "page-2");

    expect(request.method).toBe("text_relevance");
    expect(request.url).toContain("searchText");
    expect(request.body).toMatchObject({
      textQuery: expect.stringContaining("cultural attractions"),
      pageSize: 20,
      pageToken: "page-2",
      locationRestriction: { rectangle: {} },
    });
    expect(request.fieldMask).toContain("nextPageToken");
    expect(googleSearchPageLimit("culture", 3)).toBe(3);
  });

  it("calculates the request ceiling before a batch runs", () => {
    expect(estimateMaximumGoogleRequests(5, ["food", "culture"], 3)).toBe(20);
    expect(estimateMaximumGoogleRequests(50, ["food", "culture", "nature", "nightlife"], 3))
      .toBe(400);
  });
});
