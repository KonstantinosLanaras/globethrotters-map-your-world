import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Bookmark, Plus, ChevronRight } from "lucide-react";
import { useLists } from "@/hooks/useLists";

const Lists = () => {
  const { data: lists = [] } = useLists();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[90px] px-6 pb-12 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" />
              <h1 className="font-display text-3xl font-semibold text-foreground">My Lists</h1>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              New List
            </button>
          </div>
          <p className="text-muted-foreground mb-8">Curate your world, one list at a time</p>
        </motion.div>

        {lists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Bookmark className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No lists yet. Create your first collection.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {lists.map((list, i) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all cursor-pointer group"
              >
                <span className="text-3xl">{list.emoji}</span>
                <div className="flex-1">
                  <p className="font-display text-base font-medium text-foreground group-hover:text-primary transition-colors">
                    {list.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{list.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lists;
