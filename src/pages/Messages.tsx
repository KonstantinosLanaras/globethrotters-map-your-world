import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MessageSquare, User, MapPin, Star, Plane } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkMessagesRead,
  ConversationWithProfile,
} from "@/hooks/useMessages";
import Navbar from "@/components/Navbar";
import { format, isToday, isYesterday } from "date-fns";

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

const Messages = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  if (conversationId) {
    return <ChatView conversationId={conversationId} />;
  }

  return <ConversationList />;
};

// ─── Conversation List ───
const ConversationList = () => {
  const navigate = useNavigate();
  const { data: conversations = [], isLoading } = useConversations();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[70px] pb-12 max-w-2xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <h1 className="font-display text-xl font-semibold text-foreground mb-4">Messages</h1>

        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">Loading…</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a conversation from a connection's profile</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((c, i) => (
              <ConversationRow key={c.id} conversation={c} index={i} onClick={() => navigate(`/messages/${c.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ConversationRow = ({ conversation: c, index, onClick }: { conversation: ConversationWithProfile; index: number; onClick: () => void }) => (
  <motion.button
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03 }}
    onClick={onClick}
    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card border border-transparent hover:border-border transition-all text-left"
  >
    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
      {c.other_user?.avatar_url ? (
        <img src={c.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <User className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm truncate ${c.unread_count > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
          {c.other_user?.display_name || "Traveler"}
        </p>
        {c.last_message && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTime(c.last_message.created_at)}</span>
        )}
      </div>
      {c.last_message && (
        <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? "text-foreground" : "text-muted-foreground"}`}>
          {c.last_message.content}
        </p>
      )}
    </div>
    {c.unread_count > 0 && (
      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {c.unread_count}
      </span>
    )}
  </motion.button>
);

// ─── Chat View ───
const ChatView = ({ conversationId }: { conversationId: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const { data: conversations = [] } = useConversations();
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();

  const conversation = conversations.find((c) => c.id === conversationId);
  const otherUser = conversation?.other_user;

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId) {
      markRead.mutate(conversationId);
    }
  }, [conversationId, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      await sendMessage.mutateAsync({ conversationId, content: text });
    } catch {
      setInput(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="pt-[60px] flex flex-col flex-1 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <button onClick={() => navigate("/messages")} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => otherUser?.user_id && navigate(`/user/${otherUser.user_id}`)}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <span className="text-sm font-medium text-foreground">{otherUser?.display_name || "Traveler"}</span>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground animate-pulse py-12">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const shareData = parseShareContent(msg.content);

              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md"
                    } ${shareData ? "p-2" : "px-3.5 py-2"}`}
                  >
                    {shareData ? (
                      <SharedCardBubble data={shareData} isMine={isMine} />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                    <p className={`text-[9px] mt-1 ${shareData ? "px-1.5" : ""} ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {format(new Date(msg.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground resize-none focus:outline-none focus:border-primary/40 max-h-24"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendMessage.isPending}
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Shared card parser ─── */
function parseShareContent(content: string): { item: any; note?: string } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.__share && parsed?.item) return { item: parsed.item, note: parsed.note };
  } catch {
    // Not a share payload
  }
  return null;
}

/* ─── Shared card bubble in chat ─── */
const SharedCardBubble = ({ data, isMine }: { data: { item: any; note?: string }; isMine: boolean }) => {
  const { item, note } = data;

  return (
    <div className="space-y-1.5">
      {note && (
        <p className="px-1.5 whitespace-pre-wrap break-words text-sm">{note}</p>
      )}
      <div className={`rounded-xl overflow-hidden border ${isMine ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-muted/40"}`}>
        {item.type === "experience" ? (
          <div className="flex items-center gap-2.5 p-2.5">
            {item.photo ? (
              <img src={item.photo} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${isMine ? "bg-primary-foreground/20" : "bg-muted"}`}>
                <MapPin className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{item.title}</p>
              <p className={`text-[10px] truncate ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {item.city}{item.country ? `, ${item.country}` : ""} · {item.category}
              </p>
            </div>
            {item.rating > 0 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-[10px] font-medium">{item.rating}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-2.5">
            {item.coverImage ? (
              <img src={item.coverImage} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${isMine ? "bg-primary-foreground/20" : "bg-muted"}`}>
                {item.emoji || "✈️"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{item.title}</p>
              <p className={`text-[10px] truncate ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {item.destinations?.length > 0 ? item.destinations.slice(0, 2).join(", ") : "Journey"} · {item.experienceCount || 0} exp
              </p>
            </div>
            <Plane className="w-3.5 h-3.5 flex-shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
