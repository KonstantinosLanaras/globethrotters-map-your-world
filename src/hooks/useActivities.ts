import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Activity {
  name: string;
  category: "food" | "hiking" | "nature" | "culture" | "scenic" | "transport" | "hidden_gem";
  description: string;
  difficulty: "easy" | "moderate" | "challenging" | "none";
  duration: string;
  // Extended fields for Google Maps integration (future)
  source?: "community" | "google" | "ai";
  rating?: number;
  review_count?: number;
  is_sponsored?: boolean;
  place_id_google?: string;
}

interface UseActivitiesResult {
  activities: Activity[];
  loading: boolean;
  error: string | null;
}

export const useActivities = (placeName: string | null, country: string | null): UseActivitiesResult => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placeName || !country) {
      setActivities([]);
      return;
    }

    let cancelled = false;
    const fetchActivities = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check local cache first (from Supabase table)
        const { data: cached } = await supabase
          .from("destination_activities")
          .select("activities")
          .eq("place_name", placeName)
          .eq("country", country)
          .maybeSingle();

        if (cached && !cancelled) {
          const cachedActivities = (cached.activities as unknown as Activity[]).map((a) => ({
            ...a,
            source: a.source || ("ai" as const),
          }));
          setActivities(cachedActivities);
          setLoading(false);
          return;
        }

        // Call edge function
        const { data, error: fnError } = await supabase.functions.invoke("discover-activities", {
          body: { placeName, country },
        });

        if (cancelled) return;

        if (fnError) {
          throw new Error(fnError.message || "Failed to fetch activities");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        const fetched = (data?.activities || []).map((a: Activity) => ({
          ...a,
          source: "ai" as const,
        }));
        setActivities(fetched);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load activities");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchActivities();
    return () => { cancelled = true; };
  }, [placeName, country]);

  return { activities, loading, error };
};
