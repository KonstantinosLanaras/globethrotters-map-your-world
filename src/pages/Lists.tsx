import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Bookmark, Plus, Trash2, X, MapPin, ChevronDown, ChevronRight, Globe } from "lucide-react";
import { useLists, useAddList, useDeleteList } from "@/hooks/useLists";
import { useListPlacesWithDetails } from "@/hooks/useListPlaces";
import { toast } from "sonner";

/** List detail view — places grouped by geography */
const ListDetail = ({ listId, onBack }: { listId: string; onBack: () => void }) => {
  const { data: lists = [] } = useLists();
  const { data: items = [], isLoading } = useListPlacesWithDetails(listId);
  const list = lists.find((l) => l.id === listId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Group by country
  const grouped = (() => {
    const g: Record<string, typeof items> = {};
    items.forEach((item) => {
      if (!item.place) return;
      const country = item.place.country || "Unknown";
      if (!g[country]) g[country] = [];
      g[country].push(item);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  })();

  // Auto-expand
  if (expanded.size === 0 && grouped.length > 0) {
    const all = new Set(grouped.map(([c]) => c));
    if (all.size > 0) setTimeout(() => setExpanded(all), 0);
  }

  const toggleCountry = (c: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <button onClick={onBack} className="text-xs text-primary hover:underline mb-2 flex items-center gap-1">
          ← All Collections
        </button>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{list?.emoji || "📍"}</span>
          <h1 className="font-display text-2xl font-semibold text-foreground">{list?.title || "Collection"}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "place" : "places"} across {grouped.length}{" "}
          {grouped.length === 1 ? "country" : "countries"}
        </p>
      </motion.div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No places in this collection yet.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Save places to your wishlist and assign them to this collection.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([country, countryItems], ci) => (
            <motion.div
              key={country}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.04 }}
            >
              <button
                onClick={() => toggleCountry(country)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors mb-1"
              >
                {expanded.has(country) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{country}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {countryItems.length}
                </span>
              </button>

              <AnimatePresence>
                {expanded.has(country) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-6 space-y-1.5 overflow-hidden"
                  >
                    {countryItems.map((item, i) => (
                      <motion.div
                        key={item.listPlaceId}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary flex-shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.place?.name || "Unknown"}
                          </p>
                          {item.place?.tags && item.place.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {item.place.tags.slice(0, 3).map((tag: string) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            item.place?.type === "visited"
                              ? "bg-visited/10 text-visited"
                              : "bg-wishlist/10 text-wishlist"
                          }`}
                        >
                          {item.place?.type === "visited" ? "Visited" : "Wishlist"}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
};

const Lists = () => {
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const deleteList = useDeleteList();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📍");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const emojiOptions = ["📍", "✈️", "🏔️", "🍽️", "🏖️", "🌍", "❤️", "⭐", "🎒", "🗺️", "💎", "🕊️", "🥾"];

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await addList.mutateAsync({ title: newTitle.trim(), description: "", emoji: newEmoji });
      toast.success(`Created "${newTitle}"`);
      setNewTitle("");
      setNewEmoji("📍");
      setShowCreate(false);
    } catch {
      toast.error("Failed to create list");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    try {
      await deleteList.mutateAsync(id);
      toast.success(`Deleted "${title}"`);
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (selectedListId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[76px] px-6 pb-12 max-w-3xl mx-auto">
          <ListDetail listId={selectedListId} onBack={() => setSelectedListId(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[76px] px-6 pb-12 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bookmark className="w-5 h-5 text-primary" />
              <h1 className="font-display text-2xl font-semibold text-foreground">Collections</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Organize your saved places into thematic collections
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </motion.div>

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">New Collection</h3>
                  <button onClick={() => setShowCreate(false)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {emojiOptions.map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewEmoji(e)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        newEmoji === e ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-muted"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Best hikes, Dream beaches..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newTitle.trim()}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {lists.length === 0 && !showCreate ? (
          <div className="text-center py-20">
            <Bookmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No collections yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Create collections like "Best hikes" or "Food spots" to organize your wishlist.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {lists.map((list, i) => (
              <motion.button
                key={list.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedListId(list.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-all group text-left"
              >
                <span className="text-2xl">{list.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{list.title}</p>
                  {list.description && (
                    <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(e, list.id, list.title)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lists;
