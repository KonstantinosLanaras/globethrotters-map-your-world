import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Place } from "./usePlaces";

export const usePlaceListIds = (placeId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["place-list-ids", placeId, user?.id],
    enabled: !!user && !!placeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("list_places")
        .select("list_id")
        .eq("place_id", placeId);
      if (error) throw error;
      return (data ?? []).map((d) => d.list_id);
    },
  });
};

/** Fetch all list_places for the current user's lists, joined with place data */
export const useListPlacesWithDetails = (listId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["list-places-details", listId, user?.id],
    enabled: !!user && !!listId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("list_places")
        .select("*, places(*)")
        .eq("list_id", listId!);
      if (error) throw error;
      return (data ?? []).map((lp: any) => ({
        listPlaceId: lp.id as string,
        addedAt: lp.added_at as string,
        place: lp.places as Place,
      }));
    },
  });
};

/** Fetch ALL list_places for all of the user's lists */
export const useAllListPlaces = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-list-places", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all user's lists first
      const { data: lists, error: listErr } = await supabase
        .from("lists")
        .select("id");
      if (listErr) throw listErr;
      if (!lists || lists.length === 0) return [];

      const listIds = lists.map((l) => l.id);
      const { data, error } = await supabase
        .from("list_places")
        .select("list_id, place_id")
        .in("list_id", listIds);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAddPlaceToList = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, placeId }: { listId: string; placeId: string }) => {
      const { data, error } = await supabase
        .from("list_places")
        .insert({ list_id: listId, place_id: placeId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["place-list-ids", vars.placeId] });
      qc.invalidateQueries({ queryKey: ["lists"] });
      qc.invalidateQueries({ queryKey: ["list-places-details"] });
      qc.invalidateQueries({ queryKey: ["all-list-places"] });
    },
  });
};

export const useRemovePlaceFromList = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, placeId }: { listId: string; placeId: string }) => {
      const { error } = await supabase
        .from("list_places")
        .delete()
        .eq("list_id", listId)
        .eq("place_id", placeId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["place-list-ids", vars.placeId] });
      qc.invalidateQueries({ queryKey: ["lists"] });
      qc.invalidateQueries({ queryKey: ["list-places-details"] });
      qc.invalidateQueries({ queryKey: ["all-list-places"] });
    },
  });
};
