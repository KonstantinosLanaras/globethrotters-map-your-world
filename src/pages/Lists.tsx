import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Bookmark, Plus, ChevronRight, Trash2, X, MapPin } from "lucide-react";
import { useLists, useAddList, useDeleteList } from "@/hooks/useLists";
import { toast } from "sonner";

const Lists = () => {
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const deleteList = useDeleteList();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📍");

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

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteList.mutateAsync(id);
      toast.success(`Deleted "${title}"`);
    } catch {
      toast.error("Failed to delete");
    }
  };

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
              <h1 className="font-display text-2xl font-semibold text-foreground">My Lists</h1>
            </div>
            <p className="text-sm text-muted-foreground">{lists.length} custom collections</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New List
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
                  <h3 className="text-sm font-medium text-foreground">New List</h3>
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
                    placeholder="List name..."
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
            <p className="text-muted-foreground text-sm">No custom lists yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Create collections to organize your places.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lists.map((list, i) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-all group"
              >
                <span className="text-2xl">{list.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{list.title}</p>
                  {list.description && (
                    <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(list.id, list.title)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lists;
