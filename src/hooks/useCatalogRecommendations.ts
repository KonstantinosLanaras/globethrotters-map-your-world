import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const explorerCategories = ["food", "culture", "nature", "hiking", "nightlife"] as const;
export type ExplorerCategory = (typeof explorerCategories)[number];

/**
 * Data layer for the future open Explorer question and category search.
 * Keeping it separate means the current MVP questionnaire does not change.
 */
export const useCatalogRecommendations = (
  citySlug: string | null,
  categories: ExplorerCategory[] = [],
  limit = 20,
) => useQuery({
  queryKey: ["catalog-recommendations", citySlug, [...categories].sort().join(","), limit],
  enabled: !!citySlug,
  staleTime: 1000 * 60 * 10,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_catalog_recommendations", {
      p_city_slug: citySlug!,
      p_categories: categories.length > 0 ? categories : null,
      p_limit: limit,
    });
    if (error) throw error;
    return data ?? [];
  },
});
