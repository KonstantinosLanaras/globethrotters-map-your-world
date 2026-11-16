// Generated from scripts/data/catalogue_taxonomy.json; keep definitions in sync.
export const CATALOG_TAXONOMY = {
  "version": "2026-11-11-v1",
  "categories": {
    "food": {
      "label": "Food & drinks",
      "subcategories": {
        "restaurants": {
          "label": "Restaurants",
          "aliases": [
            "restaurant",
            "pizzeria",
            "tapas bar",
            "fine dining",
            "mountain hut",
            "cava and sandwich bar"
          ]
        },
        "street_food": {
          "label": "Street food",
          "aliases": [
            "street food",
            "fast food",
            "sandwich shop",
            "snack bar"
          ]
        },
        "cafes_bakeries": {
          "label": "Cafés & bakeries",
          "aliases": [
            "cafe",
            "bakery",
            "pastry shop",
            "patisserie",
            "bakery and cafe",
            "ice cream shop"
          ]
        },
        "food_markets": {
          "label": "Food markets",
          "aliases": [
            "food market",
            "food hall",
            "food court"
          ]
        },
        "food_experiences": {
          "label": "Food experiences",
          "aliases": [
            "winery",
            "food tour",
            "cooking class",
            "tasting",
            "neighbourhood food",
            "producer experience"
          ]
        }
      }
    },
    "nature": {
      "label": "Nature",
      "subcategories": {
        "hikes_trails": {
          "label": "Hikes & trails",
          "aliases": [
            "hiking route",
            "classified hiking route",
            "trail",
            "trailhead",
            "urban hike",
            "walking route",
            "riverside walk",
            "park walk",
            "hillside walk"
          ]
        },
        "parks_gardens": {
          "label": "Parks & gardens",
          "aliases": [
            "park",
            "garden",
            "botanical garden",
            "urban forest",
            "laurel forest"
          ]
        },
        "beaches_lakes": {
          "label": "Beaches & lakes",
          "aliases": [
            "beach",
            "lake",
            "natural pool",
            "swimming spot",
            "lake and park",
            "lake park",
            "black-sand beach"
          ]
        },
        "sunsets_views": {
          "label": "Sunsets & views",
          "aliases": [
            "viewpoint",
            "sunset experience",
            "sunrise experience",
            "timed viewpoint experience",
            "seasonal night viewpoint"
          ]
        },
        "natural_sites": {
          "label": "Natural sites",
          "aliases": [
            "natural feature",
            "nature reserve",
            "cave",
            "gorge",
            "waterfall",
            "rock formation",
            "geological formation"
          ]
        }
      }
    },
    "culture": {
      "label": "Culture",
      "subcategories": {
        "museums_galleries": {
          "label": "Museums & galleries",
          "aliases": [
            "museum",
            "art gallery",
            "art museum",
            "contemporary art",
            "cultural centre",
            "contemporary culture centre",
            "archaeological and culture centre",
            "garden and museum"
          ]
        },
        "historic_sites": {
          "label": "Historic sites",
          "aliases": [
            "historic site",
            "historical landmark",
            "monument",
            "cathedral",
            "church",
            "palace",
            "castle",
            "historic house and architecture"
          ]
        },
        "neighbourhoods_walks": {
          "label": "Neighbourhoods & walks",
          "aliases": [
            "neighbourhood walk",
            "historical walk",
            "neighbourhood experience",
            "town walking route",
            "art walking route",
            "architecture walking route"
          ]
        }
      }
    },
    "nightlife": {
      "label": "Nightlife",
      "subcategories": {
        "bars": {
          "label": "Bars",
          "aliases": [
            "bar",
            "wine bar",
            "cocktail bar",
            "sunset bar",
            "hotel bar",
            "apres-ski bar",
            "poncha bar",
            "rum bar",
            "historic bar",
            "bar and restaurant"
          ]
        },
        "clubs": {
          "label": "Clubs",
          "aliases": [
            "nightclub",
            "club",
            "electronic music club",
            "open-air club",
            "open-air nightclub",
            "club and cultural venue"
          ]
        },
        "live_music": {
          "label": "Live music",
          "aliases": [
            "live music venue",
            "fado venue",
            "jazz club",
            "music bar",
            "concert venue",
            "club and live music",
            "listening bar"
          ]
        },
        "rooftops": {
          "label": "Rooftops",
          "aliases": [
            "rooftop bar"
          ]
        },
        "nightlife_areas": {
          "label": "Nightlife areas",
          "aliases": [
            "nightlife district",
            "neighbourhood evening",
            "nightlife area experience",
            "timed nightlife experience"
          ]
        }
      }
    }
  }
} as const;

export type CatalogCategory = keyof typeof CATALOG_TAXONOMY.categories;
export type ContentKind = "place" | "area_experience" | "route_experience" | "timed_experience";
export const contentKinds = ["place", "area_experience", "route_experience", "timed_experience"] as const;
export const categoryKeys = Object.keys(CATALOG_TAXONOMY.categories) as CatalogCategory[];
export const subcategoryKeys = categoryKeys.flatMap(category => Object.keys(CATALOG_TAXONOMY.categories[category].subcategories));

export function isCategory(value: unknown): value is CatalogCategory {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CATALOG_TAXONOMY.categories, value);
}
export function isSubcategory(category: unknown, key: unknown): key is string {
  return isCategory(category) && typeof key === "string" && Object.prototype.hasOwnProperty.call(CATALOG_TAXONOMY.categories[category].subcategories, key);
}
export function subcategoryLabel(category: unknown, key: unknown): string | null {
  if (!isCategory(category) || !isSubcategory(category, key)) return null;
  const groups = CATALOG_TAXONOMY.categories[category].subcategories as Record<string, {label: string}>;
  return groups[key].label;
}
export function isCanonicalActivity(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.name === "string" && item.name.trim().length > 0
    && isSubcategory(item.category, item.subcategory)
    && contentKinds.includes(item.content_kind as ContentKind)
    && typeof item.description === "string"
    && ["easy", "moderate", "challenging", "none"].includes(item.difficulty as string)
    && typeof item.duration === "string"
    && typeof item.recommended_time === "string";
}
export function isCurrentActivityCache(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.length > 0 && value.every(item =>
    isCanonicalActivity(item) && item.taxonomy_version === CATALOG_TAXONOMY.version);
}
export const taxonomyPrompt = categoryKeys.map(category =>
  `${category}: ${Object.entries(CATALOG_TAXONOMY.categories[category].subcategories).map(([key, group]) => `${key} (${group.label})`).join(", ")}`
).join("\n");
