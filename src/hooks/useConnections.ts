import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "connected";

export const useConnectionStatus = (targetUserId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["connection-status", user?.id, targetUserId],
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    queryFn: async (): Promise<ConnectionStatus> => {
      // Check if current user follows target (sent request)
      const { data: sent } = await supabase
        .from("followers")
        .select("status")
        .eq("follower_id", user!.id)
        .eq("following_id", targetUserId!)
        .maybeSingle();

      if (sent) {
        return sent.status === "active" ? "connected" : "pending_sent";
      }

      // Check if target follows current user (received request)
      const { data: received } = await supabase
        .from("followers")
        .select("status")
        .eq("follower_id", targetUserId!)
        .eq("following_id", user!.id)
        .maybeSingle();

      if (received) {
        return received.status === "active" ? "connected" : "pending_received";
      }

      return "none";
    },
  });
};

export const useSendConnectionRequest = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("followers")
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
          status: "pending",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connection-status"] });
      qc.invalidateQueries({ queryKey: ["follower-count"] });
    },
  });
};

export const useAcceptConnection = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (requesterId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Update the requester's follow to active
      const { error: e1 } = await supabase
        .from("followers")
        .update({ status: "active" })
        .eq("follower_id", requesterId)
        .eq("following_id", user.id);
      if (e1) throw e1;

      // Create reciprocal connection
      const { error: e2 } = await supabase
        .from("followers")
        .upsert({
          follower_id: user.id,
          following_id: requesterId,
          status: "active",
        });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connection-status"] });
      qc.invalidateQueries({ queryKey: ["follower-count"] });
      qc.invalidateQueries({ queryKey: ["following-count"] });
    },
  });
};

export const useRemoveConnection = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Remove both directions
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", targetUserId)
        .eq("following_id", user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connection-status"] });
      qc.invalidateQueries({ queryKey: ["follower-count"] });
      qc.invalidateQueries({ queryKey: ["following-count"] });
    },
  });
};
