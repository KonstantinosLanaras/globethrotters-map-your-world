import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, X, MapPin, Globe, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SearchResult {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  privacy: string;
  home_base: string | null;
}

const PeopleSearch = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Search profiles
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query.trim().toLowerCase();
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url, bio, privacy, home_base")
          .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
          .neq("user_id", user?.id ?? "")
          .limit(8);

        if (!error && data) {
          setResults(data as SearchResult[]);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, user?.id]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setQuery("");
      navigate(`/user/${result.user_id}`);
    },
    [navigate]
  );

  return (
    <div ref={panelRef} className="relative">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          isOpen
            ? "bg-card border-primary/20 shadow-sm w-52 md:w-64"
            : "bg-muted/50 border-transparent w-40 md:w-48 hover:bg-muted/80"
        }`}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search people…"
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query.trim().length >= 2 || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1.5 left-0 right-0 min-w-[260px] bg-card/98 backdrop-blur-xl rounded-xl border border-border shadow-xl overflow-hidden z-[2000]"
          >
            {loading && (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center">Searching…</div>
            )}
            {!loading && results.length === 0 && query.trim().length >= 2 && (
              <div className="px-4 py-5 text-center">
                <User className="w-5 h-5 text-muted-foreground/50 mx-auto mb-1.5" />
                <p className="text-xs text-muted-foreground">No people found</p>
              </div>
            )}
            {results.map((result) => (
              <button
                key={result.user_id}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {result.avatar_url ? (
                    <img src={result.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {result.display_name || "Traveler"}
                    </span>
                    {result.username && (
                      <span className="text-xs text-muted-foreground truncate">@{result.username}</span>
                    )}
                  </div>
                  {result.home_base && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {result.home_base}
                    </p>
                  )}
                </div>
                <Globe className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PeopleSearch;
