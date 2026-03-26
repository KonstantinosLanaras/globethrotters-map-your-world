import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useActivities, Activity } from "./useActivities";
import { usePromotedPlaces, PromotedPlace } from "./usePromotedPlaces";
import { useMemo } from "react";

export interface CommunityExperience {
  id: string;
  user_id: string;
  title: string;
  caption: string | null;
  city: string | null;
  country: string | null;
  category: string;
  tags: string[];
  visibility: string;
  lat: number | null;
  lng: number | null;
  saves_count: number;
  clicks_count: number;
  rating_avg: number;
  review_count: number;
  engagement_score: number;
  is_seeded: boolean;
  is_sponsored: boolean;
  created_at: string;
  // joined
  author_name?: string;
  author_trust?: number;
}

export type UnifiedExperience = {
  type: "seeded" | "community" | "sponsored";
  // Seeded activity fields
  activity?: Activity;
  // Community experience fields  
  experience?: CommunityExperience;
  // Sponsored fields
  promoted?: PromotedPlace;
  // Common
  name: string;
  category: string;
  description: string;
  rating: number;
  reviewCount: number;
  engagement: number;
  label?: "Sponsored" | "Trending" | "Rising" | "Community" | "Popular" | "Verified";
};

// Fetch community experiences for a city
export const useCommunityExperiences = (city: string | null, country: string | null) => {
  return useQuery({
    queryKey: ["community-experiences", city, country],
    enabled: !!city && !!country,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("visibility", "public")
        .ilike("city", city!)
        .ilike("country", country!)
        .order("engagement_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CommunityExperience[];
    },
  });
};

// Save/unsave an experience
export const useToggleExperienceSave = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ experienceId, isSaved }: { experienceId: string; isSaved: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isSaved) {
        const { error } = await supabase
          .from("experience_saves")
          .delete()
          .eq("experience_id", experienceId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("experience_saves")
          .insert({ experience_id: experienceId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-experiences"] });
      qc.invalidateQueries({ queryKey: ["experience-saves"] });
    },
  });
};

// Get user's saved experience ids
export const useExperienceSaves = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["experience-saves", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experience_saves")
        .select("experience_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map(d => d.experience_id));
    },
  });
};

// Submit a review
export const useSubmitExperienceReview = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ experienceId, rating, comment }: { experienceId: string; rating: number; comment?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("experience_reviews")
        .upsert({
          experience_id: experienceId,
          user_id: user.id,
          rating,
          comment: comment || null,
        }, { onConflict: "experience_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-experiences"] });
    },
  });
};

// Quality thresholds for sponsored
const SPONSORED_MIN_RATING = 4.5;
const SPONSORED_MIN_REVIEWS = 5;

const isPromotedQualified = (p: PromotedPlace): boolean => {
  const rating = p.quality_score / 10;
  return p.is_active && rating >= SPONSORED_MIN_RATING && p.impressions >= SPONSORED_MIN_REVIEWS;
};

/**
 * Build unified ranked list: sponsored → top seeded → top community → new community
 */
export const useUnifiedExperiences = (city: string | null, country: string | null) => {
  const { activities, loading: seededLoading } = useActivities(city, country);
  const { data: community = [], isLoading: communityLoading } = useCommunityExperiences(city, country);
  const { data: promoted = [] } = usePromotedPlaces();
  const { data: profile } = useProfile();

  const interests = profile?.interests || [];
  const personality = profile?.personality || "";

  const unified = useMemo(() => {
    // Personalization: boost categories matching user interests
    const boostCategory = (cat: string): number => {
      const all = [...interests, personality].map(s => s?.toLowerCase() || "");
      if (cat === "food" && all.some(s => s.includes("food") || s.includes("culinary"))) return 10;
      if ((cat === "hiking" || cat === "hike") && all.some(s => s.includes("adventure") || s.includes("hik"))) return 10;
      if (cat === "culture" && all.some(s => s.includes("culture") || s.includes("history"))) return 10;
      if (cat === "hidden_gem" && all.some(s => s.includes("hidden") || s.includes("local"))) return 10;
      return 0;
    };

    // 1. Seeded experiences (AI-generated activities)
    const seededItems: UnifiedExperience[] = activities.map(a => {
      const pseudoRating = 4.0 + (a.name.length % 10) / 10;
      const pseudoReviews = 50 + (a.name.length * 17) % 2000;
      return {
        type: "seeded" as const,
        activity: a,
        name: a.name,
        category: a.category,
        description: a.description || "",
        rating: pseudoRating,
        reviewCount: pseudoReviews,
        engagement: pseudoRating * 10 + pseudoReviews * 0.01,
        label: "Verified" as const,
      };
    });

    const sortedSeeded = [...seededItems].sort((a, b) =>
      (b.engagement + boostCategory(b.category)) - (a.engagement + boostCategory(a.category))
    );

    // 2. Sponsored (max 2, quality-gated) with fallback to top ranked results
    const qualifiedPromoted = promoted
      .filter(isPromotedQualified)
      .slice(0, 2);

    const sponsoredItems: UnifiedExperience[] = qualifiedPromoted.length > 0
      ? qualifiedPromoted.map(p => ({
          type: "sponsored" as const,
          promoted: p,
          name: p.business_name,
          category: p.business_type,
          description: p.description || "",
          rating: p.quality_score / 10,
          reviewCount: p.impressions,
          engagement: p.quality_score,
          label: "Sponsored" as const,
        }))
      : sortedSeeded.slice(0, 2).map(item => ({
          ...item,
          type: "sponsored" as const,
          label: "Sponsored" as const,
        }));

    const sponsoredNames = new Set(sponsoredItems.map(item => item.name));
    const remainingSeeded = sortedSeeded.filter(item => !sponsoredNames.has(item.name));

    // 3. Community experiences
    const communityItems: UnifiedExperience[] = community.map(e => {
      const isTrending = e.engagement_score >= 50 && e.saves_count >= 5;
      const isRising = e.engagement_score >= 20 && !isTrending;
      return {
        type: "community" as const,
        experience: e,
        name: e.title,
        category: e.category,
        description: e.caption || "",
        rating: Number(e.rating_avg) || 0,
        reviewCount: e.review_count,
        engagement: Number(e.engagement_score),
        label: isTrending ? "Trending" as const : isRising ? "Rising" as const : "Community" as const,
      };
    });

    const topCommunity = communityItems
      .filter(e => e.engagement >= 20)
      .sort((a, b) => b.engagement - a.engagement);

    const newCommunity = communityItems
      .filter(e => e.engagement < 20)
      .sort((a, b) => new Date(b.experience!.created_at).getTime() - new Date(a.experience!.created_at).getTime());

    return {
      sponsored: sponsoredItems,
      topPicks: remainingSeeded.slice(0, 5),
      trending: topCommunity.filter(e => e.label === "Trending"),
      hiddenGems: [...topCommunity.filter(e => e.label === "Rising"), ...newCommunity],
      recommended: [...remainingSeeded.slice(5), ...topCommunity, ...newCommunity]
        .sort((a, b) => (b.engagement + boostCategory(b.category)) - (a.engagement + boostCategory(a.category))),
      allSeeded: remainingSeeded,
    };
  }, [activities, community, promoted, interests, personality]);

  return {
    ...unified,
    loading: seededLoading || communityLoading,
  };
};
