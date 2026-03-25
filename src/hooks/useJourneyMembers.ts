import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface JourneyMember {
  id: string;
  journey_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  status: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export const useJourneyMembers = (journeyId?: string) => {
  return useQuery({
    queryKey: ["journey-members", journeyId],
    enabled: !!journeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_members" as any)
        .select("*")
        .eq("journey_id", journeyId!);
      if (error) throw error;
      const members = (data ?? []) as unknown as JourneyMember[];
      if (members.length === 0) return [];
      
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);
      
      return members.map(m => ({
        ...m,
        profile: profiles?.find(p => p.user_id === m.user_id) || undefined,
      }));
    },
  });
};

export const useInviteToJourney = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ journeyId, userId }: { journeyId: string; userId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("journey_members" as any)
        .insert({
          journey_id: journeyId,
          user_id: userId,
          invited_by: user.id,
          status: "accepted",
          role: "member",
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["journey-members", vars.journeyId] });
    },
  });
};

export const useRemoveJourneyMember = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, journeyId }: { id: string; journeyId: string }) => {
      const { error } = await supabase
        .from("journey_members" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return journeyId;
    },
    onSuccess: (journeyId) => {
      qc.invalidateQueries({ queryKey: ["journey-members", journeyId] });
    },
  });
};

export const useJourneyJoinRequests = (journeyId?: string) => {
  return useQuery({
    queryKey: ["journey-join-requests", journeyId],
    enabled: !!journeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journey_join_requests" as any)
        .select("*")
        .eq("journey_id", journeyId!)
        .eq("status", "pending");
      if (error) throw error;
      const requests = (data ?? []) as unknown as { id: string; journey_id: string; user_id: string; status: string; created_at: string }[];
      if (requests.length === 0) return [];

      const userIds = requests.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      return requests.map(r => ({
        ...r,
        profile: profiles?.find(p => p.user_id === r.user_id),
      }));
    },
  });
};

export const useRespondToJoinRequest = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, journeyId, userId, accept }: { requestId: string; journeyId: string; userId: string; accept: boolean }) => {
      // Update request status
      await supabase
        .from("journey_join_requests" as any)
        .update({ status: accept ? "accepted" : "declined" } as any)
        .eq("id", requestId);

      // If accepted, add as member
      if (accept) {
        await supabase
          .from("journey_members" as any)
          .insert({ journey_id: journeyId, user_id: userId, status: "accepted", role: "member" } as any);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["journey-join-requests", vars.journeyId] });
      qc.invalidateQueries({ queryKey: ["journey-members", vars.journeyId] });
    },
  });
};
