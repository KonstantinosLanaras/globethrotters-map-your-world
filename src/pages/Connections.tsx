import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, Clock, UserX, Users, ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAcceptConnection, useRemoveConnection } from "@/hooks/useConnections";
import { useStartConversation } from "@/hooks/useMessages";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface ConnectionProfile {
  follower_id: string;
  following_id: string;
  status: string;
  created_at: string;
  profile?: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    home_base: string | null;
  };
}

const Connections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const acceptConnection = useAcceptConnection();
  const removeConnection = useRemoveConnection();
  const startConversation = useStartConversation();
  const [tab, setTab] = useState<"connections" | "incoming" | "sent">("connections");

  // Fetch all follow relationships involving current user
  const { data: allFollows = [], isLoading } = useQuery({
    queryKey: ["all-connections", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followers")
        .select("follower_id, following_id, status, created_at")
        .or(`follower_id.eq.${user!.id},following_id.eq.${user!.id}`);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Gather all user IDs we need profiles for
  const userIds = [...new Set(allFollows.flatMap((f) => [f.follower_id, f.following_id]).filter((id) => id !== user?.id))];

  const { data: profiles = [] } = useQuery({
    queryKey: ["connection-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, home_base")
        .in("user_id", userIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Categorize
  const connections: ConnectionProfile[] = [];
  const incoming: ConnectionProfile[] = [];
  const sent: ConnectionProfile[] = [];

  allFollows.forEach((f) => {
    const otherId = f.follower_id === user?.id ? f.following_id : f.follower_id;
    const profile = profiles.find((p) => p.user_id === otherId);
    const item = { ...f, profile };

    if (f.status === "active") {
      // Only add once (avoid duplicates from bidirectional)
      if (f.follower_id === user?.id && !connections.find((c) => c.profile?.user_id === otherId)) {
        connections.push(item);
      } else if (f.following_id === user?.id && !connections.find((c) => c.profile?.user_id === otherId)) {
        connections.push(item);
      }
    } else if (f.status === "pending") {
      if (f.following_id === user?.id) {
        incoming.push(item);
      } else if (f.follower_id === user?.id) {
        sent.push(item);
      }
    }
  });

  const handleAccept = async (requesterId: string) => {
    try {
      await acceptConnection.mutateAsync(requesterId);
      qc.invalidateQueries({ queryKey: ["all-connections"] });
      toast.success("Connection accepted!");
    } catch {
      toast.error("Failed to accept");
    }
  };

  const handleReject = async (requesterId: string) => {
    try {
      await removeConnection.mutateAsync(requesterId);
      qc.invalidateQueries({ queryKey: ["all-connections"] });
      toast.success("Request declined");
    } catch {
      toast.error("Failed to decline");
    }
  };

  const handleMessage = async (userId: string) => {
    try {
      const convoId = await startConversation.mutateAsync(userId);
      navigate(`/messages/${convoId}`);
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  const tabs = [
    { id: "connections" as const, label: "Connections", count: connections.length, icon: <Users className="w-3.5 h-3.5" /> },
    { id: "incoming" as const, label: "Requests", count: incoming.length, icon: <UserPlus className="w-3.5 h-3.5" /> },
    { id: "sent" as const, label: "Sent", count: sent.length, icon: <Clock className="w-3.5 h-3.5" /> },
  ];

  const currentList = tab === "connections" ? connections : tab === "incoming" ? incoming : sent;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[70px] pb-12 max-w-2xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <h1 className="font-display text-xl font-semibold text-foreground mb-4">Connections</h1>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  tab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Loading…</div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {tab === "connections" ? "No connections yet" : tab === "incoming" ? "No pending requests" : "No sent requests"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.map((item, i) => {
              const p = item.profile;
              const otherId = p?.user_id;
              return (
                <motion.div
                  key={`${item.follower_id}-${item.following_id}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                >
                  <button
                    onClick={() => otherId && navigate(`/user/${otherId}`)}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden"
                  >
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <button onClick={() => otherId && navigate(`/user/${otherId}`)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{p?.display_name || "Traveler"}</p>
                    {p?.username && <p className="text-[11px] text-muted-foreground">@{p.username}</p>}
                    {p?.home_base && <p className="text-[10px] text-muted-foreground">{p.home_base}</p>}
                  </button>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {tab === "incoming" && otherId && (
                      <>
                        <button
                          onClick={() => handleAccept(otherId)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(otherId)}
                          className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[11px] font-medium hover:bg-destructive/10 hover:text-destructive"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {tab === "connections" && otherId && (
                      <button
                        onClick={() => handleMessage(otherId)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {tab === "sent" && (
                      <span className="px-2 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] font-medium">Pending</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Connections;
