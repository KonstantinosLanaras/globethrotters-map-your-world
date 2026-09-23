import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export interface PromotedPlace {
  id: string;
  place_id: string | null;
  business_name: string;
  business_type: string;
  description: string | null;
  website_url: string | null;
  quality_score: number;
  impressions: number;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export const usePromotedPlaces = () => {
  return useQuery({
    queryKey: ["promoted-places"],
    enabled: !isDemoMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoted_places")
        .select("*")
        .order("quality_score", { ascending: false });
      if (error) throw error;
      return (data as PromotedPlace[]) ?? [];
    },
  });
};
