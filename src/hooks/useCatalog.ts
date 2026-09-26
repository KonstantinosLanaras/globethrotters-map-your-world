import { useQuery } from "@tanstack/react-query";
import { curatedExperiences } from "@/data/curatedExperiences";
import { supabase } from "@/integrations/supabase/client";

export type CatalogCategory = "food" | "culture" | "nature" | "nightlife";
export type CatalogQualityTier = "coverage" | "popular" | "editorial" | "community";

export interface CatalogItem {
  id: string;
  city: string;
  country: string;
  citySlug: string;
  name: string;
  lat: number;
  lng: number;
  category: CatalogCategory;
  subcategory: string;
  description: string;
  source: "curated" | "overture" | "osm" | "wikidata";
  sourceId: string;
  qualityTier: CatalogQualityTier;
  selectionRank: number | null;
  confidence: number | null;
  tags: string[];
}

type CatalogRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  canonical_category: string;
  subcategory: string;
  description: string | null;
  source: string;
  source_id: string;
  quality_tier: string;
  selection_rank: number | null;
  source_confidence: number | null;
  catalog_cities: { name: string; country: string; slug: string } | null;
};

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

const curatedCatalog: CatalogItem[] = curatedExperiences.map((item) => ({
  id: item.id,
  city: item.city,
  country: item.country,
  citySlug: `${item.city}-${item.country}`.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  name: item.name,
  lat: item.lat,
  lng: item.lng,
  category: item.category as CatalogCategory,
  subcategory: item.tags?.[0] || item.category,
  description: item.description,
  source: "curated",
  sourceId: item.id,
  qualityTier: "editorial",
  selectionRank: null,
  confidence: 1,
  tags: item.tags || [],
}));

const rowToCatalogItem = (row: CatalogRow): CatalogItem | null => {
  if (!row.catalog_cities) return null;
  return {
    id: row.id,
    city: row.catalog_cities.name,
    country: row.catalog_cities.country,
    citySlug: row.catalog_cities.slug,
    name: row.name,
    lat: row.latitude,
    lng: row.longitude,
    category: row.canonical_category as CatalogCategory,
    subcategory: row.subcategory,
    description: row.description || "",
    source: row.source as CatalogItem["source"],
    sourceId: row.source_id,
    qualityTier: row.quality_tier as CatalogQualityTier,
    selectionRank: row.selection_rank,
    confidence: row.source_confidence,
    tags: [row.canonical_category, row.subcategory],
  };
};

const mergeWithCurated = (items: CatalogItem[]) => {
  const seen = new Set(items.map((item) => `${item.city.toLocaleLowerCase()}::${item.name.toLocaleLowerCase()}`));
  return [
    ...items,
    ...curatedCatalog.filter((item) => !seen.has(`${item.city.toLocaleLowerCase()}::${item.name.toLocaleLowerCase()}`)),
  ];
};

const catalogSelect = `
  id,
  name,
  latitude,
  longitude,
  canonical_category,
  subcategory,
  description,
  source,
  source_id,
  quality_tier,
  selection_rank,
  source_confidence,
  catalog_cities!inner(name,country,slug)
`;

export const useCatalogItems = (city: string | null, country: string | null) =>
  useQuery({
    queryKey: ["catalog-items", city, country],
    enabled: Boolean(city && country),
    queryFn: async () => {
      const fallback = curatedCatalog.filter(
        (item) => item.city.toLocaleLowerCase() === city!.toLocaleLowerCase()
          && item.country.toLocaleLowerCase() === country!.toLocaleLowerCase(),
      );
      if (isDemoMode) return fallback;

      const { data, error } = await supabase
        .from("catalog_items")
        .select(catalogSelect)
        .eq("is_active", true)
        .ilike("catalog_cities.name", city!)
        .ilike("catalog_cities.country", country!)
        .order("quality_tier", { ascending: false })
        .order("selection_rank", { ascending: true, nullsFirst: false });

      if (error) {
        console.warn("Catalogue unavailable; using editorial fallback", error.message);
        return fallback;
      }

      const rows = (data as unknown as CatalogRow[])
        .map(rowToCatalogItem)
        .filter((item): item is CatalogItem => item !== null);
      return mergeWithCurated(rows).filter(
        (item) => item.city.toLocaleLowerCase() === city!.toLocaleLowerCase()
          && item.country.toLocaleLowerCase() === country!.toLocaleLowerCase(),
      );
    },
    staleTime: 15 * 60 * 1000,
  });

export const useCatalogMapItems = () =>
  useQuery({
    queryKey: ["catalog-map-items"],
    queryFn: async () => {
      if (isDemoMode) return curatedCatalog;

      const allRows: CatalogRow[] = [];
      const pageSize = 1000;
      for (let start = 0; start < 4000; start += pageSize) {
        const { data, error } = await supabase
          .from("catalog_items")
          .select(catalogSelect)
          .eq("is_active", true)
          .range(start, start + pageSize - 1);
        if (error) {
          console.warn("Catalogue map layer unavailable; using editorial fallback", error.message);
          return curatedCatalog;
        }
        const page = data as unknown as CatalogRow[];
        allRows.push(...page);
        if (page.length < pageSize) break;
      }

      const rows = allRows.map(rowToCatalogItem).filter((item): item is CatalogItem => item !== null);
      return mergeWithCurated(rows);
    },
    staleTime: 15 * 60 * 1000,
  });

export const editorialCatalog = curatedCatalog;
