import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

// Types for tables not yet in generated types
interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface ConversationWithProfile extends Conversation {
  other_user: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  last_message?: Message | null;
  unread_count: number;
}

export type { Conversation, Message, ConversationWithProfile };

export const useConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ConversationWithProfile[]> => {
      // Fetch conversations
      const { data: convos, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_one.eq.${user!.id},participant_two.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      if (!convos || convos.length === 0) return [];

      // Get other user IDs
      const otherIds = convos.map((c: any) =>
        c.participant_one === user!.id ? c.participant_two : c.participant_one
      );

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", otherIds);

      // Fetch last message & unread count for each conversation
      const result: ConversationWithProfile[] = await Promise.all(
        (convos as Conversation[]).map(async (c) => {
          const otherId = c.participant_one === user!.id ? c.participant_two : c.participant_one;
          const profile = profiles?.find((p) => p.user_id === otherId) || null;

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unread } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .neq("sender_id", user!.id)
            .is("read_at", null);

          return {
            ...c,
            other_user: profile,
            last_message: lastMsg as Message | null,
            unread_count: unread ?? 0,
          };
        })
      );

      return result;
    },
  });
};

export const useMessages = (conversationId?: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as Message[]) ?? [];
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, qc]);

  return query;
};

export const useSendMessage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      } as any);
      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() } as any)
        .eq("id", conversationId);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useStartConversation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      if (!user) throw new Error("Not authenticated");

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_one.eq.${user.id},participant_two.eq.${otherUserId}),and(participant_one.eq.${otherUserId},participant_two.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) return existing.id;

      // Create new conversation
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          participant_one: user.id,
          participant_two: otherUserId,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useMarkMessagesRead = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) return;
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() } as any)
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUnreadCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-count", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      // Get all user's conversations
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_one.eq.${user!.id},participant_two.eq.${user!.id}`);

      if (!convos || convos.length === 0) return 0;

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convos.map((c: any) => c.id))
        .neq("sender_id", user!.id)
        .is("read_at", null);

      return count ?? 0;
    },
  });
};
