import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  personality: string;
  interests: string[];
  privacy: "private" | "friends" | "public";
  is_verified: boolean;
  trust_score: number;
  verified_at: string | null;
  bio: string;
  home_base: string;
  username: string;
  dream_destinations: string[];
  languages: string[];
  marketing_opt_in: boolean;
  marketing_consent_at: string | null;
  marketing_consent_version: string | null;
  signup_source: string;
  travel_style: string[];
  next_trip: string;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", updates.user_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
};
