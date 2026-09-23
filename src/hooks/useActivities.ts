import { useMemo } from "react";
import { useCatalogItems, type CatalogCategory, type CatalogQualityTier } from "./useCatalog";

export interface Activity {
  id?: string;
  name: string;
  category: CatalogCategory;
  description: string;
  difficulty: "easy" | "moderate" | "challenging" | "none";
  duration: string;
  source?: "community" | "curated" | "overture" | "osm" | "wikidata";
  source_id?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  review_count?: number;
  is_sponsored?: boolean;
  place_id_google?: string;
  popularity_score?: number;
  quality_tier?: CatalogQualityTier;
  subcategory?: string;
  tags?: string[];
}

interface UseActivitiesResult {
  activities: Activity[];
  loading: boolean;
  error: string | null;
}

export const useActivities = (placeName: string | null, country: string | null): UseActivitiesResult => {
  const query = useCatalogItems(placeName, country);

  const activities = useMemo<Activity[]>(() => (query.data || []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description,
    difficulty: "none",
    duration: "",
    source: item.source,
    source_id: item.sourceId,
    lat: item.lat,
    lng: item.lng,
    popularity_score: item.qualityTier === "popular" ? 100 : item.qualityTier === "editorial" ? 90 : 50,
    quality_tier: item.qualityTier,
    subcategory: item.subcategory,
    tags: item.tags,
  })), [query.data]);

  return {
    activities,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
};
