export type CatalogSearchCategory = "food" | "culture" | "nature" | "nightlife";
export type GoogleSearchMethod = "nearby_popularity" | "text_relevance";

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

type TextStrategy = {
  method: "text_relevance";
  query: string;
};

export type GoogleSearchStrategy = NearbyStrategy | TextStrategy;

export const GOOGLE_SEARCH_STRATEGIES: Record<CatalogSearchCategory, GoogleSearchStrategy> = {
  food: {
    method: "nearby_popularity",
    includedTypes: ["restaurant", "cafe", "bakery"],
    excludedTypes: ["fast_food_restaurant"],
  },
  culture: {
    method: "text_relevance",
    query: "cultural attractions museums monuments and historic sites",
  },
  nature: {
    method: "text_relevance",
    query: "parks gardens hiking trails beaches and nature",
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
  category: CatalogSearchCategory,
  requestedTextPages: number,
) => GOOGLE_SEARCH_STRATEGIES[category].method === "nearby_popularity"
  ? 1
  : Math.min(3, Math.max(1, requestedTextPages));

export const buildGoogleSearchRequest = (
  category: CatalogSearchCategory,
  city: GoogleSearchCity,
  minRating: number,
  pageToken?: string,
) => {
  const strategy = GOOGLE_SEARCH_STRATEGIES[category];
  if (strategy.method === "nearby_popularity") {
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
  }

  const latitudeDelta = city.search_radius_km / 111;
  const longitudeDelta = city.search_radius_km
    / (111 * Math.max(0.2, Math.cos(city.latitude * Math.PI / 180)));
  return {
    method: strategy.method,
    url: "https://places.googleapis.com/v1/places:searchText",
    fieldMask: [...COMMON_GOOGLE_PLACE_FIELDS, "nextPageToken"].join(","),
    body: {
      textQuery: `${strategy.query} in ${city.name}, ${city.country}`,
      minRating,
      pageSize: 20,
      languageCode: "en",
      regionCode: city.country_code,
      locationRestriction: {
        rectangle: {
          low: { latitude: city.latitude - latitudeDelta, longitude: city.longitude - longitudeDelta },
          high: { latitude: city.latitude + latitudeDelta, longitude: city.longitude + longitudeDelta },
        },
      },
      ...(pageToken ? { pageToken } : {}),
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
