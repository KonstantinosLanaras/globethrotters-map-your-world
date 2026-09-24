import { motion, AnimatePresence } from "framer-motion";
import { Map, MapPin, Heart, User, Menu, X, LogOut, Users, MessageSquare, Star, LogIn, Camera } from "lucide-react";
import GlobetrottersLogo from "@/components/GlobetrottersLogo";
import PeopleSearch from "@/components/PeopleSearch";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useMessages";
import type { SearchMode } from "@/components/CityExploreBar";

interface NavbarProps {
  searchMode?: SearchMode;
  onSearchModeChange?: (mode: SearchMode) => void;
  onExploreToggle?: () => void;
  exploreBarVisible?: boolean;
}

const navItems = [
  { icon: <Map className="w-4 h-4" />, label: "Explore", path: "/", mode: "places" as SearchMode },
  { icon: <MapPin className="w-4 h-4" />, label: "Visited", path: "/visited" },
  { icon: <Heart className="w-4 h-4" />, label: "Wishlist", path: "/wishlist" },
];

const Navbar = ({ searchMode = "places", onSearchModeChange, onExploreToggle, exploreBarVisible = true }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, loading: authLoading } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setProfileOpen(false);
    setMenuOpen(false);
    await signOut();
    navigate("/auth");
  };

  const handleExperiencesClick = useCallback(() => {
    // If not on home page, navigate there first
    if (location.pathname !== "/") {
      navigate("/");
    }
    onSearchModeChange?.("experiences");
  }, [onSearchModeChange, location.pathname, navigate]);

  const handleExploreClick = useCallback(() => {
    if (location.pathname === "/") {
      // Already on explore page — toggle the search bar
      onExploreToggle?.();
    } else {
      navigate("/");
      onSearchModeChange?.("places");
    }
  }, [onExploreToggle, onSearchModeChange, location.pathname, navigate]);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-[1003] flex items-center justify-between px-4 h-[60px] bg-card/85 backdrop-blur-xl border-b border-border gap-2"
    >
      <button onClick={() => { navigate("/"); onSearchModeChange?.("places"); }} className="flex items-center gap-2 flex-shrink-0">
        <GlobetrottersLogo variant="full" size={26} animate={false} className="text-foreground" />
      </button>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-1">
        {/* Explore */}
        <button
          onClick={handleExploreClick}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
            location.pathname === "/" && searchMode === "places"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Map className="w-4 h-4" />
          Explore
        </button>

        {user && (
          <button
            onClick={() => navigate("/experiences")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
              location.pathname === "/experiences"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Camera className="w-4 h-4" />
            Feed
          </button>
        )}

        {/* Visited */}
        <button
          onClick={() => navigate("/visited")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
            location.pathname === "/visited" || location.pathname === "/places"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Visited
        </button>

        {/* Wishlist */}
        <button
          onClick={() => navigate("/wishlist")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
            location.pathname === "/wishlist"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Heart className="w-4 h-4" />
          Wishlist
        </button>

        {/* Favorites */}
        <button
          onClick={() => navigate("/favorites")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
            location.pathname === "/favorites"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Star className="w-4 h-4" />
          Favorites
        </button>

      </div>

      {/* Account actions */}
      <div className="hidden md:flex items-center gap-2">
        {!authLoading && !user ? (
          <>
            <button
              onClick={() => navigate("/auth?mode=login")}
              className="px-3 py-2 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/auth?mode=signup")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-sm hover:opacity-90 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Create account
            </button>
          </>
        ) : user ? (
          <>
            <PeopleSearch />

            {/* Messages */}
            <button
              onClick={() => navigate("/messages")}
              className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                location.pathname.startsWith("/messages")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Connections */}
            <button
              onClick={() => navigate("/connections")}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                location.pathname === "/connections"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Users className="w-4 h-4" />
            </button>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  location.pathname === "/profile" || profileOpen
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <User className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-40 bg-card border border-border rounded-xl shadow-xl z-[1010] overflow-hidden"
                  >
                    <button
                      onClick={() => { navigate("/profile"); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      Profile
                    </button>
                    <div className="h-px bg-border" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : null}
      </div>

      {/* Mobile menu */}
      <button className="md:hidden w-8 h-8 flex items-center justify-center" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-border p-3 md:hidden"
        >
          {user && (
            <div className="mb-3 px-1 space-y-2">
              <PeopleSearch />
            </div>
          )}

          {[
            { icon: <Map className="w-4 h-4" />, label: "Explore", action: handleExploreClick },
            ...(user ? [{ icon: <Camera className="w-4 h-4" />, label: "Feed", action: () => navigate("/experiences") }] : []),
            { icon: <MapPin className="w-4 h-4" />, label: "Visited", action: () => navigate("/visited") },
            { icon: <Heart className="w-4 h-4" />, label: "Wishlist", action: () => navigate("/wishlist") },
            ...(user ? [
              { icon: <MessageSquare className="w-4 h-4" />, label: "Messages", action: () => navigate("/messages") },
              { icon: <Users className="w-4 h-4" />, label: "Connections", action: () => navigate("/connections") },
              { icon: <User className="w-4 h-4" />, label: "Profile", action: () => navigate("/profile") },
            ] : []),
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <div className="h-px bg-border my-1" />
          {user ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <>
              <button
                onClick={() => { navigate("/auth?mode=login"); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => { navigate("/auth?mode=signup"); setMenuOpen(false); }}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
              >
                <LogIn className="w-4 h-4" />
                Create account
              </button>
            </>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
