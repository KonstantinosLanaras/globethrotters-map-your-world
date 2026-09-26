import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isMissingCatalogItemColumn } from "@/lib/databaseErrors";

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
  catalog_item_id: string | null;
}

type NewPlace = Omit<
  Place,
  "id" | "user_id" | "created_at" | "updated_at" | "visibility" | "catalog_item_id"
> & { catalog_item_id?: string | null };

export const usePlaces = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["places", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("user_id", user!.id)
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
    mutationFn: async (place: NewPlace) => {
      if (!user) throw new Error("Not authenticated");

      const findByName = () => supabase
        .from("places")
        .select("id, type, catalog_item_id")
        .eq("user_id", user.id)
        .ilike("name", place.name)
        .ilike("country", place.country)
        .maybeSingle();

      // Canonical catalogue IDs are stable across spelling/localization changes.
      // The name fallback also keeps saves working until the Lovable migration
      // has been applied and lets older saved rows be linked in place.
      let schemaSupportsCatalogId = true;
      let existing: { id: string; type: string; catalog_item_id?: string | null } | null = null;
      if (place.catalog_item_id) {
        const canonicalResult = await supabase
          .from("places")
          .select("id, type, catalog_item_id")
          .eq("user_id", user.id)
          .eq("catalog_item_id", place.catalog_item_id)
          .maybeSingle();
        if (canonicalResult.error && !isMissingCatalogItemColumn(canonicalResult.error)) {
          throw canonicalResult.error;
        }
        schemaSupportsCatalogId = !canonicalResult.error;
        existing = canonicalResult.data;
      }

      if (!existing) {
        const nameResult = await findByName();
        if (nameResult.error && !isMissingCatalogItemColumn(nameResult.error)) throw nameResult.error;
        if (nameResult.error) {
          schemaSupportsCatalogId = false;
          const legacyResult = await supabase
            .from("places")
            .select("id, type")
            .eq("user_id", user.id)
            .ilike("name", place.name)
            .ilike("country", place.country)
            .maybeSingle();
          if (legacyResult.error) throw legacyResult.error;
          existing = legacyResult.data;
        } else {
          existing = nameResult.data;
        }
      }

      if (existing) {
        if (existing.type === place.type) {
          if (schemaSupportsCatalogId && place.catalog_item_id && !existing.catalog_item_id) {
            const { error: linkError } = await supabase
              .from("places")
              .update({ catalog_item_id: place.catalog_item_id })
              .eq("id", existing.id);
            if (linkError) throw linkError;
          }
          throw new Error(`Already ${place.type === "visited" ? "marked as visited" : "in wishlist"}`);
        }
        // Update existing place type
        const { data, error } = await supabase
          .from("places")
          .update({
            type: place.type,
            date_visited: place.date_visited,
            ...(schemaSupportsCatalogId && place.catalog_item_id
              ? { catalog_item_id: place.catalog_item_id }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      let { data, error } = await supabase
        .from("places")
        .insert({ ...place, user_id: user.id })
        .select()
        .single();
      if (error && place.catalog_item_id && isMissingCatalogItemColumn(error)) {
        const { catalog_item_id: _catalogItemId, ...legacyPlace } = place;
        const legacyResult = await supabase
          .from("places")
          .insert({ ...legacyPlace, user_id: user.id })
          .select()
          .single();
        data = legacyResult.data;
        error = legacyResult.error;
      }
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
