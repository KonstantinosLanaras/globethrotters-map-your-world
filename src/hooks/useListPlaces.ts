import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
    },
  });
};
