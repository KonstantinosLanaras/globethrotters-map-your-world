import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ReputationData {
  validated_score: number;
  contribution_count: number;
  travelers_helped: number;
  trust_score: number;
}

export interface ContributionImpact {
  id: string;
  impact_type: string;
  points: number;
  experience_id: string | null;
  created_at: string;
}

// Fetch reputation from profile
export const useReputation = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reputation", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("validated_score, contribution_count, travelers_helped, trust_score")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as ReputationData;
    },
  });
};

// Fetch impact log
export const useContributionImpacts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contribution-impacts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_impacts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as ContributionImpact[]) ?? [];
    },
  });
};

// Trigger reputation recompute
export const useRecomputeReputation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compute-reputation", {
        body: { user_id: user!.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reputation"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

// Mark experience as helpful
export const useToggleHelpful = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      experienceId,
      isHelpful,
    }: {
      experienceId: string;
      isHelpful: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      if (isHelpful) {
        // Remove helpful mark
        const { error } = await supabase
          .from("helpful_marks")
          .delete()
          .eq("experience_id", experienceId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Add helpful mark
        const { error } = await supabase
          .from("helpful_marks")
          .insert({ experience_id: experienceId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpful-marks"] });
      qc.invalidateQueries({ queryKey: ["discover-experiences"] });
    },
  });
};

// Check which experiences the user has marked helpful
export const useUserHelpfulMarks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["helpful-marks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpful_marks")
        .select("experience_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data || []).map((d) => d.experience_id));
    },
  });
};
