import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Check, Bookmark, Heart, MapPin } from "lucide-react";
import { useLists, useAddList } from "@/hooks/useLists";
import { useAddPlaceToList, usePlaceListIds } from "@/hooks/useListPlaces";
import { toast } from "sonner";

interface AddToListDialogProps {
  placeId: string;
  placeName: string;
  onClose: () => void;
}

const AddToListDialog = ({ placeId, placeName, onClose }: AddToListDialogProps) => {
  const { data: lists = [] } = useLists();
  const { data: existingListIds = [] } = usePlaceListIds(placeId);
  const addToList = useAddPlaceToList();
  const addList = useAddList();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📍");

  const handleAddToList = async (listId: string) => {
    if (existingListIds.includes(listId)) return;
    try {
      await addToList.mutateAsync({ listId, placeId });
      toast.success("Added to list!");
    } catch {
      toast.error("Failed to add");
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      const newList = await addList.mutateAsync({
        title: newTitle.trim(),
        description: "",
        emoji: newEmoji,
      });
      if (newList?.id) {
        await addToList.mutateAsync({ listId: newList.id, placeId });
      }
      toast.success(`Created "${newTitle}" and added ${placeName}`);
      setShowCreate(false);
      setNewTitle("");
    } catch {
      toast.error("Failed to create list");
    }
  };

  const emojiOptions = ["📍", "✈️", "🏔️", "🍽️", "🏖️", "🌍", "❤️", "⭐", "🎒", "🗺️"];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm mx-4 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Save to List</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{placeName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Lists */}
        <div className="max-h-[300px] overflow-y-auto p-3">
          {lists.length === 0 && !showCreate ? (
            <div className="text-center py-8">
              <Bookmark className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No lists yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {lists.map((list) => {
                const isAdded = existingListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => handleAddToList(list.id)}
                    disabled={isAdded}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                      isAdded
                        ? "bg-primary/5 cursor-default"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <span className="text-xl">{list.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{list.title}</p>
                    </div>
                    {isAdded && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Create new list */}
          <AnimatePresence>
            {showCreate ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-3 rounded-xl bg-muted/40 border border-border"
              >
                <div className="flex gap-2 mb-3 flex-wrap">
                  {emojiOptions.map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewEmoji(e)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                        newEmoji === e ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-muted"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="List name..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 mb-2"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAndAdd}
                    disabled={!newTitle.trim()}
                    className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-opacity"
                  >
                    Create & Add
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New List
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddToListDialog;
