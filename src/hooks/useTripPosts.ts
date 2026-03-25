import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TripPost {
  id: string;
  journey_id: string;
  user_id: string;
  caption: string;
  photo_url: string | null;
  experience_id: string | null;
  tagged_user_ids: string[];
  visibility: string;
  created_at: string;
  updated_at: string;
}

export const useTripPosts = (journeyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-posts", journeyId],
    enabled: !!journeyId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_posts" as any)
        .select("*")
        .eq("journey_id", journeyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TripPost[];
    },
  });
};

export const useAddTripPost = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (post: {
      journey_id: string;
      caption: string;
      photo_url?: string | null;
      experience_id?: string | null;
      tagged_user_ids?: string[];
      visibility?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("trip_posts" as any)
        .insert({
          ...post,
          user_id: user.id,
          visibility: post.visibility || "private",
          tagged_user_ids: post.tagged_user_ids || [],
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as TripPost;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["trip-posts", vars.journey_id] });
    },
  });
};

export const useDeleteTripPost = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, journeyId }: { id: string; journeyId: string }) => {
      const { error } = await supabase.from("trip_posts" as any).delete().eq("id", id);
      if (error) throw error;
      return journeyId;
    },
    onSuccess: (journeyId) => {
      qc.invalidateQueries({ queryKey: ["trip-posts", journeyId] });
    },
  });
};
