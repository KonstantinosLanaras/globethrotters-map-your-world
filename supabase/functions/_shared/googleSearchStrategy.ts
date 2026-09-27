export type CatalogSearchCategory = "food" | "culture" | "nature" | "nightlife";
export type GoogleSearchMethod = "nearby_popularity";

export type GoogleSearchCity = {
  name: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  search_radius_km: number;
};

type NearbyStrategy = {
  method: "nearby_popularity";
  includedTypes: string[];
  excludedTypes?: string[];
};

export type GoogleSearchStrategy = NearbyStrategy;

export const GOOGLE_SEARCH_STRATEGIES: Record<CatalogSearchCategory, GoogleSearchStrategy> = {
  food: {
    method: "nearby_popularity",
    includedTypes: ["restaurant", "cafe", "bakery"],
    excludedTypes: ["fast_food_restaurant"],
  },
  culture: {
    method: "nearby_popularity",
    includedTypes: [
      "art_gallery",
      "castle",
      "church",
      "cultural_landmark",
      "fountain",
      "historical_place",
      "historical_landmark",
      "monument",
      "museum",
      "observation_deck",
      "opera_house",
      "plaza",
      "sculpture",
      "tourist_attraction",
    ],
  },
  nature: {
    method: "nearby_popularity",
    includedTypes: [
      "beach",
      "botanical_garden",
      "garden",
      "hiking_area",
      "national_park",
      "nature_preserve",
      "park",
      "scenic_spot",
    ],
  },
  nightlife: {
    method: "nearby_popularity",
    includedTypes: ["night_club", "bar", "live_music_venue"],
  },
};

export const COMMON_GOOGLE_PLACE_FIELDS = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.userRatingCount",
];

export const googleSearchPageLimit = (
  _category: CatalogSearchCategory,
  _requestedTextPages: number,
) => 1;

export const buildGoogleSearchRequest = (
  category: CatalogSearchCategory,
  city: GoogleSearchCity,
  _minRating: number,
  _pageToken?: string,
) => {
  const strategy = GOOGLE_SEARCH_STRATEGIES[category];
  return {
    method: strategy.method,
    url: "https://places.googleapis.com/v1/places:searchNearby",
    fieldMask: COMMON_GOOGLE_PLACE_FIELDS.join(","),
    body: {
      includedTypes: strategy.includedTypes,
      ...(strategy.excludedTypes ? { excludedTypes: strategy.excludedTypes } : {}),
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      languageCode: "en",
      regionCode: city.country_code,
      locationRestriction: {
        circle: {
          center: { latitude: city.latitude, longitude: city.longitude },
          radius: Math.min(50_000, city.search_radius_km * 1_000),
        },
      },
    },
  } as const;
};

export const estimateMaximumGoogleRequests = (
  cityCount: number,
  categories: CatalogSearchCategory[],
  requestedTextPages: number,
) => cityCount * categories.reduce(
  (total, category) => total + googleSearchPageLimit(category, requestedTextPages),
  0,
);
