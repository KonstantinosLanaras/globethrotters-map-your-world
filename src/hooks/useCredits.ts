import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  ad_opt_in: boolean;
  updated_at: string;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export const useCredits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["credits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      // If no row exists yet (edge case), return defaults
      if (!data) {
        return {
          id: "",
          user_id: user!.id,
          balance: 0,
          lifetime_earned: 0,
          ad_opt_in: false,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        } as UserCredits;
      }

      return data as UserCredits;
    },
  });
};

export const useToggleAdOptIn = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (optIn: boolean) => {
      const { data, error } = await supabase
        .from("user_credits")
        .update({ ad_opt_in: optIn })
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credits"] }),
  });
};

export const useCreditTransactions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["credit-transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as CreditTransaction[]) ?? [];
    },
  });
};
