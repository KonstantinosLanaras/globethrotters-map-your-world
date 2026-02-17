import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface List {
  id: string;
  user_id: string;
  title: string;
  description: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

export const useLists = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as List[]) ?? [];
    },
  });
};

export const useAddList = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (list: { title: string; description: string; emoji: string }) => {
      const { data, error } = await supabase
        .from("lists")
        .insert({ ...list, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] }),
  });
};

export const useDeleteList = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] }),
  });
};
