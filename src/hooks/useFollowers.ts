import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useFollowerCount = (userId?: string) => {
  return useQuery({
    queryKey: ["follower-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
};

export const useFollowingCount = (userId?: string) => {
  return useQuery({
    queryKey: ["following-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
};

export const useFollow = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (followingId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("followers")
        .insert({ follower_id: user.id, following_id: followingId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follower-count"] });
      qc.invalidateQueries({ queryKey: ["following-count"] });
    },
  });
};

export const useUnfollow = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (followingId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", followingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follower-count"] });
      qc.invalidateQueries({ queryKey: ["following-count"] });
    },
  });
};
