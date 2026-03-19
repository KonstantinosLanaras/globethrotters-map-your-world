import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ConnectionProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

/**
 * Returns all active (mutual) connections for the current user,
 * with their profile info, suitable for the share modal picker.
 */
export const useConnections = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["share-connections", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ConnectionProfile[]> => {
      // Get users where the current user follows them AND they follow back (both active)
      const { data: following, error: e1 } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user!.id)
        .eq("status", "active");
      if (e1) throw e1;

      if (!following || following.length === 0) return [];

      const followingIds = following.map((f) => f.following_id);

      // Check which of those also follow us back
      const { data: mutual, error: e2 } = await supabase
        .from("followers")
        .select("follower_id")
        .in("follower_id", followingIds)
        .eq("following_id", user!.id)
        .eq("status", "active");
      if (e2) throw e2;

      const mutualIds = (mutual ?? []).map((m) => m.follower_id);
      if (mutualIds.length === 0) return [];

      // Get profiles
      const { data: profiles, error: e3 } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", mutualIds);
      if (e3) throw e3;

      return (profiles ?? []) as ConnectionProfile[];
    },
  });
};
