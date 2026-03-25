import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useFavoriteExperienceIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorite-experience-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_experiences" as any)
        .select("experience_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((d: any) => d.experience_id as string));
    },
  });
};

export const useFavoriteJourneyIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorite-journey-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_journeys" as any)
        .select("journey_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((d: any) => d.journey_id as string));
    },
  });
};

export const useToggleFavoriteExperience = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ experienceId, isFavorite }: { experienceId: string; isFavorite: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFavorite) {
        const { error } = await supabase
          .from("favorite_experiences" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("experience_id", experienceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorite_experiences" as any)
          .insert({ user_id: user.id, experience_id: experienceId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite-experience-ids"] });
      qc.invalidateQueries({ queryKey: ["favorite-experiences"] });
    },
  });
};

export const useToggleFavoriteJourney = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ journeyId, isFavorite }: { journeyId: string; isFavorite: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFavorite) {
        const { error } = await supabase
          .from("favorite_journeys" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("journey_id", journeyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorite_journeys" as any)
          .insert({ user_id: user.id, journey_id: journeyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite-journey-ids"] });
      qc.invalidateQueries({ queryKey: ["favorite-journeys"] });
    },
  });
};

export interface FavoriteExperience {
  id: string;
  title: string;
  caption: string | null;
  city: string | null;
  country: string | null;
  category: string;
  rating: number;
  tags: string[];
  photos: string[];
  experience_date: string | null;
  created_at: string;
  favorited_at: string;
  publish_status: "draft" | "published";
  published_at: string | null;
}

export interface FavoriteJourney {
  id: string;
  title: string;
  description: string | null;
  emoji: string | null;
  destinations: string[];
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  favorited_at: string;
}

export const useFavoriteExperiences = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorite-experiences", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FavoriteExperience[]> => {
      const { data: favs, error } = await supabase
        .from("favorite_experiences" as any)
        .select("experience_id, created_at, publish_status, published_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!favs || favs.length === 0) return [];

      const expIds = favs.map((f: any) => f.experience_id);

      const { data: exps } = await supabase
        .from("experiences")
        .select("*")
        .in("id", expIds);

      const { data: atts } = await supabase
        .from("experience_attachments")
        .select("*")
        .in("experience_id", expIds)
        .eq("attachment_type", "photo");

      return (exps ?? []).map((exp: any) => {
        const fav = (favs as any[]).find((f: any) => f.experience_id === exp.id);
        return {
          id: exp.id,
          title: exp.title,
          caption: exp.caption,
          city: exp.city,
          country: exp.country,
          category: exp.category,
          rating: exp.rating ?? 0,
          tags: exp.tags ?? [],
          experience_date: exp.experience_date,
          created_at: exp.created_at,
          photos: (atts ?? []).filter((a: any) => a.experience_id === exp.id).map((a: any) => a.url),
          favorited_at: fav?.created_at,
          publish_status: fav?.publish_status ?? "draft",
          published_at: fav?.published_at ?? null,
        };
      });
    },
  });
};

export const useFavoriteJourneys = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorite-journeys", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FavoriteJourney[]> => {
      const { data: favs, error } = await supabase
        .from("favorite_journeys" as any)
        .select("journey_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!favs || favs.length === 0) return [];

      const journeyIds = favs.map((f: any) => f.journey_id);

      const { data: journeys } = await supabase
        .from("journeys")
        .select("*")
        .in("id", journeyIds);

      return (journeys ?? []).map((j: any) => ({
        id: j.id,
        title: j.title,
        description: j.description,
        emoji: j.emoji,
        destinations: j.destinations ?? [],
        start_date: j.start_date,
        end_date: j.end_date,
        cover_image_url: j.cover_image_url,
        favorited_at: (favs as any[]).find((f: any) => f.journey_id === j.id)?.created_at,
      }));
    },
  });
};
