import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PlaceRating {
  id: string;
  place_id: string;
  user_id: string;
  overall_rating: number;
  tags: string[];
  safety_rating: number | null;
  value_rating: number | null;
  accessibility_rating: number | null;
  crowd_rating: number | null;
  family_rating: number | null;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface RatingInput {
  place_id: string;
  overall_rating: number;
  tags: string[];
  safety_rating?: number | null;
  value_rating?: number | null;
  accessibility_rating?: number | null;
  crowd_rating?: number | null;
  family_rating?: number | null;
  comment?: string;
}

export interface AggregatedRating {
  avgRating: number;
  totalReviews: number;
  dimensions: {
    safety: number | null;
    value: number | null;
    accessibility: number | null;
    crowd: number | null;
    family: number | null;
  };
  tagFrequency: Record<string, number>;
  topTags: string[];
}

export const usePlaceRatings = (placeId: string | undefined) => {
  return useQuery({
    queryKey: ["place-ratings", placeId],
    enabled: !!placeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("place_ratings")
        .select("*")
        .eq("place_id", placeId!);
      if (error) throw error;
      return (data ?? []) as PlaceRating[];
    },
  });
};

export const useMyRating = (placeId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-rating", placeId, user?.id],
    enabled: !!placeId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("place_ratings")
        .select("*")
        .eq("place_id", placeId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as PlaceRating | null;
    },
  });
};

export const useSubmitRating = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: RatingInput) => {
      if (!user) throw new Error("Not authenticated");

      const row = {
        place_id: input.place_id,
        user_id: user.id,
        overall_rating: input.overall_rating,
        tags: input.tags,
        safety_rating: input.safety_rating ?? null,
        value_rating: input.value_rating ?? null,
        accessibility_rating: input.accessibility_rating ?? null,
        crowd_rating: input.crowd_rating ?? null,
        family_rating: input.family_rating ?? null,
        comment: (input.comment || "").slice(0, 200),
        updated_at: new Date().toISOString(),
      };

      // Upsert: insert or update
      const { data, error } = await supabase
        .from("place_ratings")
        .upsert(row, { onConflict: "place_id,user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, input) => {
      qc.invalidateQueries({ queryKey: ["place-ratings", input.place_id] });
      qc.invalidateQueries({ queryKey: ["my-rating", input.place_id] });
    },
  });
};

export function aggregateRatings(ratings: PlaceRating[]): AggregatedRating {
  if (ratings.length === 0) {
    return {
      avgRating: 0,
      totalReviews: 0,
      dimensions: { safety: null, value: null, accessibility: null, crowd: null, family: null },
      tagFrequency: {},
      topTags: [],
    };
  }

  const avg = (vals: (number | null)[]) => {
    const valid = vals.filter((v): v is number => v !== null && v > 0);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  const avgRating = ratings.reduce((s, r) => s + r.overall_rating, 0) / ratings.length;

  const tagCounts: Record<string, number> = {};
  ratings.forEach((r) => {
    (r.tags || []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const tagFrequency: Record<string, number> = {};
  Object.entries(tagCounts).forEach(([tag, count]) => {
    tagFrequency[tag] = Math.round((count / ratings.length) * 100);
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return {
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews: ratings.length,
    dimensions: {
      safety: avg(ratings.map((r) => r.safety_rating)),
      value: avg(ratings.map((r) => r.value_rating)),
      accessibility: avg(ratings.map((r) => r.accessibility_rating)),
      crowd: avg(ratings.map((r) => r.crowd_rating)),
      family: avg(ratings.map((r) => r.family_rating)),
    },
    tagFrequency,
    topTags,
  };
}
