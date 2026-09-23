import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { usePlaces } from "./usePlaces";
import { rankDestinationSuggestions } from "@/data/destinationSuggestions";

export interface Suggestion {
  name: string;
  country: string;
  reason: string;
  tags: string[];
  lat: number;
  lng: number;
  match_score: number;
}

export const useSuggestions = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: places = [] } = usePlaces();

  const hasProfile = !!(profile?.personality || (profile?.interests && profile.interests.length > 0));

  return useQuery({
    queryKey: [
      "suggestions",
      user?.id,
      profile?.personality,
      profile?.interests?.join(","),
      places.map((place) => `${place.type}:${place.name}`).sort().join("|"),
    ],
    enabled: !!user && hasProfile,
    staleTime: 1000 * 60 * 30, // 30 minutes
    queryFn: async () => {
      const visited = places.filter((p) => p.type === "visited").map((p) => p.name);
      const wishlist = places.filter((p) => p.type === "wishlist").map((p) => p.name);

      const fallback = rankDestinationSuggestions(
        profile?.interests || [],
        profile?.personality || "",
        [...visited, ...wishlist],
      );

      try {
        const { data, error } = await supabase.functions.invoke("travel-suggestions", {
          body: {
            personality: profile?.personality || "",
            interests: profile?.interests || [],
            visited_places: visited,
            wishlist_places: wishlist,
          },
        });

        if (error) return fallback;
        const remote = (data?.suggestions ?? []) as Suggestion[];
        return remote.length > 0 ? remote : fallback;
      } catch {
        return fallback;
      }
    },
  });
};
