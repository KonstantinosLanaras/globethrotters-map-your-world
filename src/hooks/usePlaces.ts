import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Place {
  id: string;
  user_id: string;
  name: string;
  country: string;
  city: string | null;
  lat: number;
  lng: number;
  type: "visited" | "wishlist";
  tags: string[];
  rating: number;
  notes: string;
  date_visited: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export const usePlaces = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["places", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Place[]) ?? [];
    },
  });
};

export const useAddPlace = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (place: Omit<Place, "id" | "user_id" | "created_at" | "updated_at" | "visibility">) => {
      if (!user) throw new Error("Not authenticated");

      // Check for existing place by same user with same name+country
      const { data: existing } = await supabase
        .from("places")
        .select("id, type")
        .eq("user_id", user.id)
        .ilike("name", place.name)
        .ilike("country", place.country)
        .maybeSingle();

      if (existing) {
        if (existing.type === place.type) {
          throw new Error(`Already ${place.type === "visited" ? "marked as visited" : "in wishlist"}`);
        }
        // Update existing place type
        const { data, error } = await supabase
          .from("places")
          .update({
            type: place.type,
            date_visited: place.date_visited,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("places")
        .insert({ ...place, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["places"] }),
  });
};

export const useUpdatePlace = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Place> & { id: string }) => {
      const { data, error } = await supabase
        .from("places")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["places"] }),
  });
};

export const useDeletePlace = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("places").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["places"] }),
  });
};
