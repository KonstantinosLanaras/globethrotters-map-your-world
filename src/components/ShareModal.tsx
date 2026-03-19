import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Send, User, Check, MapPin, Star, Plane, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConnections } from "@/hooks/useShareConnections";
import { useStartConversation, useSendMessage } from "@/hooks/useMessages";
import { toast } from "sonner";

export interface ShareableExperience {
  type: "experience";
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
  category: string;
  rating?: number;
  photo?: string | null;
  caption?: string | null;
}

export interface ShareableJourney {
  type: "journey";
  id: string;
  title: string;
  emoji?: string;
  description?: string | null;
  destinations: string[];
  experienceCount: number;
  coverImage?: string | null;
}

export type ShareableItem = ShareableExperience | ShareableJourney;

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  item: ShareableItem;
}

const ShareModal = ({ open, onClose, item }: ShareModalProps) => {
  const { user } = useAuth();
  const { data: connections = [], isLoading: loadingConnections } = useConnections();
  const startConversation = useStartConversation();
  const sendMessage = useSendMessage();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery) return connections;
    const q = searchQuery.toLowerCase();
    return connections.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
    );
  }, [connections, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!user || selectedIds.length === 0) return;
    setSending(true);

    try {
      // Build the share card JSON
      const sharePayload = JSON.stringify({
        __share: true,
        item,
        note: note.trim() || undefined,
      });

      // Send to each selected connection
      for (const targetId of selectedIds) {
        const conversationId = await startConversation.mutateAsync(targetId);
        await sendMessage.mutateAsync({
          conversationId,
          content: sharePayload,
        });
      }

      toast.success(
        `Shared with ${selectedIds.length} friend${selectedIds.length > 1 ? "s" : ""}!`
      );
      onClose();
      setSelectedIds([]);
      setNote("");
      setSearchQuery("");
    } catch {
      toast.error("Failed to share");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="relative w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display text-base font-semibold text-foreground">
            Share {item.type === "experience" ? "Experience" : "Journey"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Preview card */}
        <div className="px-4 pt-3 pb-2">
          <SharePreviewCard item={item} />
        </div>

        {/* Optional note */}
        <div className="px-4 pb-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)…"
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Connection search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {/* Connection list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          {loadingConnections ? (
            <div className="text-center py-8 text-sm text-muted-foreground animate-pulse">
              Loading connections…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {connections.length === 0
                  ? "No connections yet"
                  : "No matching connections"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => {
                const isSelected = selectedIds.includes(c.user_id);
                return (
                  <button
                    key={c.user_id}
                    onClick={() => toggleSelect(c.user_id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/60 border border-transparent"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {c.display_name || "Traveler"}
                      </p>
                      {c.username && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          @{c.username}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <button
            onClick={handleSend}
            disabled={selectedIds.length === 0 || sending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {selectedIds.length || ""} friend{selectedIds.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* Inline preview of the item being shared */
const SharePreviewCard = ({ item }: { item: ShareableItem }) => {
  if (item.type === "experience") {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border">
        {item.photo ? (
          <img src={item.photo} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {item.city}
            {item.country ? `, ${item.country}` : ""} · {item.category}
          </p>
        </div>
        {item.rating && item.rating > 0 && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-foreground">{item.rating}</span>
          </div>
        )}
      </div>
    );
  }

  // Journey
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border">
      {item.coverImage ? (
        <img src={item.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-xl">
          {item.emoji || "✈️"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {item.destinations.length > 0
            ? item.destinations.slice(0, 3).join(", ")
            : "No destinations"}{" "}
          · {item.experienceCount} experience{item.experienceCount !== 1 ? "s" : ""}
        </p>
      </div>
      <Plane className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
};

export default ShareModal;
